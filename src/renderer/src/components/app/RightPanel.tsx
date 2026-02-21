/**
 * AIIRC Studio — 右侧面板（监控台）
 * 通过 runtime-service (port 3003) 代理获取所有 Agent 截屏
 * Apple HIG 紧凑设计
 */
import { Input, Modal, Tooltip } from 'antd'
import { Mouse, Plus, RefreshCw, Wifi } from 'lucide-react'
import type { FC } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

interface AgentInfo {
  id: string
  name: string
  status: 'online' | 'busy' | 'offline'
  screenshot?: string | null
  teamId?: string | null
}

interface ScanResult {
  hostname: string
  ip: string
  os: string
  connecting?: boolean
}

const RUNTIME_URL = 'http://localhost:3003'
const SERVICE_KEY = 'dev-service-key'
const AGENT_COUNT = 20

// VNC port mapping: agent-1 → 6081, agent-2 → 6082, agent-3 → 6083
function getVncUrl(agentId: string): string {
  const idx = parseInt(agentId.replace('agent-', ''))
  if (idx >= 1 && idx <= 3) {
    return `http://localhost:${6080 + idx}/vnc.html?autoconnect=true`
  }
  // Fallback: desktop-stream viewer
  return `http://localhost:3032/viewer?sessionId=${agentId}`
}

const RightPanel: FC = () => {
  const [agents, setAgents] = useState<AgentInfo[]>(
    [
      { id: 'local', name: '本机', status: 'offline' as const, screenshot: null },
      ...Array.from({ length: AGENT_COUNT - 1 }, (_, i) => ({
        id: `agent-${i + 1}`,
        name: `VM-${i + 1}`,
        status: 'offline' as const,
        screenshot: null
      }))
    ]
  )
  const [refreshing, setRefreshing] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [showScanResults, setShowScanResults] = useState(false)

  const fetchAll = useCallback(async () => {
    setRefreshing(true)
    try {
      // Fetch all agent screenshots through runtime-service (has Docker network access)
      const res = await fetch(`${RUNTIME_URL}/runtime/agent-pool/screenshots`, {
        headers: { 'x-service-key': SERVICE_KEY },
        signal: AbortSignal.timeout(15000)
      })
      if (res.ok) {
        const data = await res.json()
        const remoteAgents: AgentInfo[] = (data.agents || []).map((a: any) => ({
          id: a.id,
          name: a.id === 'agent-1' ? 'VM-1' : `VM-${a.id.replace('agent-', '')}`,
          status: a.status === 'offline' ? 'offline' : a.status === 'busy' ? 'busy' : 'online',
          screenshot: a.screenshot || null,
          teamId: a.teamId || null
        }))

        // Local machine: probe localhost:3011 directly
        let localAgent: AgentInfo = { id: 'local', name: '本机', status: 'offline', screenshot: null }
        try {
          const lr = await fetch('http://localhost:3011/health', { signal: AbortSignal.timeout(2000) })
          if (lr.ok) {
            localAgent.status = 'online'
            // Get local screenshot
            try {
              const lsr = await fetch('http://localhost:3011/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tool: 'desktop.screenshot', args: {} }),
                signal: AbortSignal.timeout(5000)
              })
              if (lsr.ok) {
                const ld = await lsr.json()
                const localArtifacts = Array.isArray(ld?.artifacts) ? ld.artifacts : []
                localAgent.screenshot = localArtifacts[0]?.data || ld?.output?.base64 || ld?.result?.screenshot || ld?.result?.data || null
              }
            } catch { /* */ }
          }
        } catch { /* */ }

        setAgents([localAgent, ...remoteAgents])
      } else {
        // Fallback: try direct health checks for the 2 exposed agents
        const fallback = agents.map(async (agent) => {
          if (agent.id === 'local') {
            try {
              const r = await fetch('http://localhost:3011/health', { signal: AbortSignal.timeout(2000) })
              return { ...agent, status: r.ok ? 'online' as const : 'offline' as const }
            } catch { return { ...agent, status: 'offline' as const } }
          }
          return agent
        })
        setAgents(await Promise.all(fallback))
      }
    } catch {
      // Network error — keep current state
    }
    setRefreshing(false)
  }, [])

  const pollRef = useRef<ReturnType<typeof setInterval>>(null)
  useEffect(() => {
    fetchAll()
    pollRef.current = setInterval(fetchAll, 15000) // Poll every 15s
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, []) // eslint-disable-line

  const onlineAgents = agents.filter(a => a.status !== 'offline')
  const offlineAgents = agents.filter(a => a.status === 'offline')

  // ── Scan Logic ──
  const handleScan = async () => {
    setScanning(true)
    setShowScanResults(true)
    setScanResults([])
    // Simulate LAN scan with runtime-service agent pool
    try {
      const res = await fetch(`${RUNTIME_URL}/runtime/agent-pool`, {
        headers: { 'x-service-key': SERVICE_KEY },
        signal: AbortSignal.timeout(5000)
      })
      if (res.ok) {
        const data = await res.json()
        const results: ScanResult[] = (data.agents || [])
          .filter((a: any) => !a.inUse || a.teamId)
          .map((a: any) => ({
            hostname: a.id,
            ip: `docker-internal`,
            os: a.inUse ? `执行中 (${a.teamId || 'unknown'})` : '空闲',
            connecting: false
          }))
        setScanResults(results)
      }
    } catch { /* */ }
    setScanning(false)
  }

  const handleConnectHost = (ip: string) => {
    // Find the agent and open VNC
    const agentId = ip // ip is actually the agent id from scan
    window.open(getVncUrl(agentId), `takeover-${agentId}`, 'width=1024,height=768')
  }

  // ── Add PC Logic ──
  const handleAddPC = () => {
    let inputValue = ''
    Modal.confirm({
      title: '添加电脑',
      content: (
        <Input
          placeholder="输入 IP 地址 (例如 192.168.1.100)"
          onChange={e => { inputValue = e.target.value }}
          style={{ marginTop: 8 }}
        />
      ),
      okText: '添加',
      cancelText: '取消',
      onOk() {
        if (!inputValue.trim()) return
        // For now just show a message
        Modal.info({ title: '提示', content: `暂不支持手动添加外部电脑，请使用扫描功能。` })
      }
    })
  }

  // ── Takeover (VNC) ──
  const handleTakeover = (agent: AgentInfo) => {
    window.open(getVncUrl(agent.id), `takeover-${agent.id}`, 'width=1024,height=768')
  }

  return (
    <PanelContainer>
      <PanelHeader>
        <HeaderTitle>监控台</HeaderTitle>
      </PanelHeader>

      {/* Scan results overlay */}
      {showScanResults && (
        <ScanPanel>
          <ScanTitle>
            {scanning ? '正在扫描 Agent Pool...' : `${scanResults.length} 台 Agent`}
            <ScanClose onClick={() => setShowScanResults(false)}>✕</ScanClose>
          </ScanTitle>
          {scanning && <ScanProgress />}
          {scanResults.map((r, i) => (
            <ScanRow key={i}>
              <ScanInfo>
                <ScanHost>{r.hostname}</ScanHost>
                <ScanMeta>{r.ip} · {r.os}</ScanMeta>
              </ScanInfo>
              <ConnectBtn
                onClick={() => handleConnectHost(r.hostname)}
                disabled={r.connecting}
              >
                {r.connecting ? '连接中...' : '接管'}
              </ConnectBtn>
            </ScanRow>
          ))}
        </ScanPanel>
      )}

      <CardGrid>
        {onlineAgents.map(agent => (
          <MiniCard key={agent.id}>
            <ScreenThumb>
              {agent.screenshot ? (
                <ThumbImg src={`data:image/png;base64,${agent.screenshot}`} />
              ) : (
                <ThumbPlaceholder />
              )}
              <LiveDot className={agent.status === 'busy' ? 'busy' : ''} />
              {agent.teamId && <TaskBadge>{agent.teamId.slice(0, 6)}</TaskBadge>}
              <TakeoverBtn onClick={() => handleTakeover(agent)}>
                <Mouse size={9} />
                <span>接管</span>
              </TakeoverBtn>
            </ScreenThumb>
            <CardName>{agent.name}</CardName>
          </MiniCard>
        ))}
        {offlineAgents.map(agent => (
          <MiniCard key={agent.id} className="offline">
            <ScreenThumb className="offline">
              <ThumbPlaceholder className="off" />
            </ScreenThumb>
            <CardName className="offline">{agent.name}</CardName>
          </MiniCard>
        ))}
      </CardGrid>

      <BottomBar>
        <Tooltip title="扫描 Agent Pool" placement="top">
          <BottomBtn onClick={handleScan}>
            <Wifi size={13} className={scanning ? 'spinning' : ''} />
            <span>扫描</span>
          </BottomBtn>
        </Tooltip>
        <Tooltip title="添加电脑" placement="top">
          <BottomBtn onClick={handleAddPC}>
            <Plus size={13} />
            <span>添加</span>
          </BottomBtn>
        </Tooltip>
        <Tooltip title="刷新状态" placement="top">
          <BottomBtn onClick={fetchAll}>
            <RefreshCw size={13} className={refreshing ? 'spinning' : ''} />
            <span>刷新</span>
          </BottomBtn>
        </Tooltip>
      </BottomBar>
    </PanelContainer>
  )
}

/* ── Styled Components ── */

const PanelContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 8px 6px;
  flex-shrink: 0;
`

const HeaderTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: 0.3px;
`

const CardGrid = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  padding: 4px 6px;
  align-content: start;
`

const MiniCard = styled.div`
  border-radius: 6px;
  background: var(--color-background-soft);
  cursor: default;
  transition: box-shadow 0.15s;
  &:hover { box-shadow: 0 0 0 1.5px var(--color-primary, #007AFF); }
  &.offline { opacity: 0.4; }
`

const ScreenThumb = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #1a1a1e;
  overflow: hidden;
  border-radius: 6px 6px 0 0;
  &.offline { background: var(--color-border); }
`

const ThumbImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`

const ThumbPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #2a2a2e, #1a1a1e);
  &.off { background: var(--color-border); opacity: 0.5; }
`

const LiveDot = styled.div`
  position: absolute;
  top: 3px;
  right: 3px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #34D399;
  box-shadow: 0 0 3px #34D39980;
  &.busy {
    background: #FBBF24;
    box-shadow: 0 0 3px #FBBF2480;
  }
`

const TaskBadge = styled.div`
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 7px;
  padding: 1px 3px;
  background: rgba(0, 122, 255, 0.8);
  color: #fff;
  border-radius: 3px;
  font-family: monospace;
`

const TakeoverBtn = styled.button`
  position: absolute;
  bottom: 3px;
  right: 3px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 1px 4px;
  border: none;
  border-radius: 3px;
  background: rgba(0,0,0,0.55);
  color: #fff;
  font-size: 8px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
  ${MiniCard}:hover & { opacity: 1; }
  &:hover { background: var(--color-primary, #007AFF); }
`

const CardName = styled.div`
  font-size: 9px;
  font-weight: 500;
  text-align: center;
  padding: 2px 2px 3px;
  color: #555;
  letter-spacing: 0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  &.offline { color: #aaa; }
  @media (prefers-color-scheme: dark) {
    color: #aaa;
    &.offline { color: #555; }
  }
`

const BottomBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-around;
  flex-shrink: 0;
  padding: 4px 4px;
  border-top: 0.5px solid var(--color-border);
`

const BottomBtn = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  background: none;
  border: none;
  color: var(--color-text-2);
  font-size: 9px;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
  transition: background 0.12s, color 0.12s;
  &:hover { background: var(--color-background-soft); color: var(--color-text); }
  &:active { transform: scale(0.92); transition-duration: 60ms; }
  .spinning { animation: spin 1s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`

/* ── Scan UI ── */

const ScanPanel = styled.div`
  margin: 4px 6px;
  padding: 8px 10px;
  background: var(--color-background-soft);
  border: 0.5px solid var(--color-border);
  border-radius: 6px;
  flex-shrink: 0;
`

const ScanTitle = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
`

const ScanClose = styled.span`
  cursor: pointer;
  opacity: 0.5;
  &:hover { opacity: 1; }
`

const ScanProgress = styled.div`
  height: 2px;
  background: var(--color-border);
  border-radius: 1px;
  margin-bottom: 6px;
  overflow: hidden;
  &::after {
    content: '';
    display: block;
    width: 40%;
    height: 100%;
    background: var(--color-primary, #007AFF);
    border-radius: 1px;
    animation: slide 1s ease-in-out infinite;
  }
  @keyframes slide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
  }
`

const ScanRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  border-bottom: 0.5px solid var(--color-border);
  &:last-child { border-bottom: none; }
`

const ScanInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const ScanHost = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ScanMeta = styled.div`
  font-size: 9px;
  color: var(--color-text-3);
`

const ConnectBtn = styled.button<{ disabled?: boolean }>`
  flex-shrink: 0;
  height: 20px;
  padding: 0 8px;
  border: 0.5px solid var(--color-primary, #007AFF);
  border-radius: 4px;
  background: transparent;
  color: var(--color-primary, #007AFF);
  font-size: 10px;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  &:hover { background: var(--color-primary, #007AFF); color: #fff; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`

export default RightPanel
