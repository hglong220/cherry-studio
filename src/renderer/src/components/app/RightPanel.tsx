/**
 * AIIRC Studio — 右侧面板（监控台）
 * 双列截屏缩略图 + 接管按钮 + 扫描/添加/刷新
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
  port: number
  ip?: string
}

interface ScanResult {
  hostname: string
  ip: string
  os: string
  connecting?: boolean
}

const RightPanel: FC = () => {
  const [agents, setAgents] = useState<AgentInfo[]>(
    [
      // 本机（desktop-agent on localhost）
      { id: 'local', name: '本机', status: 'offline' as const, screenshot: null, port: 3011 },
      // 虚拟电脑 VM-1 ~ VM-19
      ...Array.from({ length: 19 }, (_, i) => ({
        id: `agent-${i + 1}`,
        name: `VM-${i + 1}`,
        status: 'offline' as const,
        screenshot: null,
        port: 4011 + i + 1
      }))
    ]
  )
  const [refreshing, setRefreshing] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState<ScanResult[]>([])
  const [showScanResults, setShowScanResults] = useState(false)

  const fetchAll = useCallback(async () => {
    setRefreshing(true)
    const checks = agents.map(async (agent) => {
      try {
        const r = await fetch(`http://localhost:${agent.port}/health`, { signal: AbortSignal.timeout(2000) })
        const isOnline = r.ok
        let screenshot: string | null = null
        if (isOnline && (agent.id === 'local' || parseInt(agent.id.replace('agent-', '')) <= 5)) {
          try {
            const sr = await fetch(`http://localhost:${agent.port}/execute`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tool: 'desktop.screenshot', args: {} }),
              signal: AbortSignal.timeout(5000)
            })
            if (sr.ok) {
              const data = await sr.json()
              screenshot = data?.result?.screenshot || data?.result?.data || data?.result?.image || null
            }
          } catch { /* */ }
        }
        return { ...agent, status: isOnline ? 'online' as const : 'offline' as const, screenshot }
      } catch {
        return { ...agent, status: 'offline' as const, screenshot: null }
      }
    })
    setAgents(await Promise.all(checks))
    setRefreshing(false)
  }, [agents])

  const pollRef = useRef<ReturnType<typeof setInterval>>(null)
  useEffect(() => {
    fetchAll()
    pollRef.current = setInterval(fetchAll, 20000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, []) // eslint-disable-line

  const onlineAgents = agents.filter(a => a.status !== 'offline')
  const offlineAgents = agents.filter(a => a.status === 'offline')

  // ── Scan Logic ──
  const handleScan = async () => {
    setScanning(true)
    setScanResults([])
    setShowScanResults(true)

    try {
      const res = await fetch('http://localhost:3022/api/scan-lan', {
        method: 'POST',
        signal: AbortSignal.timeout(15000)
      })
      if (res.ok) {
        const data = await res.json()
        setScanResults(data.hosts || [])
        if (!data.hosts || data.hosts.length === 0) {
          window.toast.info('未发现局域网设备')
        }
      } else {
        window.toast.error('扫描失败')
      }
    } catch {
      window.toast.error('后端未连接，无法扫描')
    }
    setScanning(false)
  }

  const handleConnectHost = (ip: string) => {
    setScanResults(prev => prev.map(r => r.ip === ip ? { ...r, connecting: true } : r))
    // In real implementation: install agent on target PC, then add to agents list
    setTimeout(() => {
      window.toast.success(`正在连接 ${ip}...`)
      setScanResults(prev => prev.map(r => r.ip === ip ? { ...r, connecting: false } : r))
    }, 2000)
  }

  // ── Add PC Logic ──
  const handleAddPC = () => {
    let ipValue = ''
    Modal.confirm({
      title: '添加电脑',
      icon: null,
      width: 360,
      content: (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8 }}>
            输入目标电脑的 IP 地址
          </div>
          <Input
            placeholder="192.168.1.xxx"
            onChange={(e) => { ipValue = e.target.value }}
            style={{ borderRadius: 6 }}
          />
        </div>
      ),
      okText: '连接',
      cancelText: '取消',
      onOk: () => {
        if (ipValue.trim()) {
          window.toast.success(`正在连接 ${ipValue}...`)
        }
      }
    })
  }

  // ── Takeover (VNC) ──
  const handleTakeover = (agent: AgentInfo) => {
    // Open noVNC or similar in a new window
    const vncUrl = `http://localhost:${agent.port + 100}/vnc.html?autoconnect=true`
    window.open(vncUrl, `takeover-${agent.id}`, 'width=1024,height=768')
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
            {scanning ? '正在扫描局域网...' : `发现 ${scanResults.length} 台电脑`}
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
                onClick={() => handleConnectHost(r.ip)}
                disabled={r.connecting}
              >
                {r.connecting ? '连接中...' : '连接'}
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
              <LiveDot />
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
        <Tooltip title="扫描局域网" placement="top">
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
  gap: 6px;
  padding: 10px 10px 6px;
  flex-shrink: 0;
`

const HeaderTitle = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-2);
  letter-spacing: 0.02em;
`

const CardGrid = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px 6px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  align-content: start;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`

const MiniCard = styled.div`
  border-radius: 6px;
  overflow: hidden;
  border: 0.5px solid var(--color-border);
  background: var(--color-background);
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  cursor: default;

  &:hover {
    border-color: var(--color-text-3);
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  &.offline {
    opacity: 0.4;
    &:hover { opacity: 0.6; }
  }
`

const ScreenThumb = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #1a1a1e;
  overflow: hidden;
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
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #34c759;
  box-shadow: 0 0 3px rgba(52, 199, 89, 0.6);
`

const TakeoverBtn = styled.div`
  position: absolute;
  top: 3px;
  left: 3px;
  display: flex;
  align-items: center;
  gap: 2px;
  background: rgba(0,0,0,0.6);
  border: 0.5px solid rgba(255,255,255,0.15);
  border-radius: 3px;
  padding: 2px 5px;
  font-size: 9px;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  opacity: 0;
  transition: opacity 150ms;
  ${MiniCard}:hover & { opacity: 1; }
  &:hover {
    background: rgba(99, 102, 241, 0.7);
    color: #fff;
  }
`

const CardName = styled.div`
  font-size: 10px;
  font-weight: 500;
  color: var(--color-text);
  padding: 3px 5px;
  text-align: center;
  &.offline { color: var(--color-text-3); }
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
  color: var(--color-text-3);
  font-size: 10px;
  &:hover { color: var(--color-text); }
`

const ScanProgress = styled.div`
  height: 2px;
  border-radius: 1px;
  background: var(--color-border);
  overflow: hidden;
  margin-bottom: 6px;
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: 40%;
    background: var(--color-primary, #6366F1);
    border-radius: 1px;
    animation: scanSlide 1.2s ease-in-out infinite;
  }
  @keyframes scanSlide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(300%); }
  }
`

const ScanRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  & + & { border-top: 0.5px solid var(--color-border); }
`

const ScanInfo = styled.div`
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
  border: 0.5px solid var(--color-primary, #6366F1);
  border-radius: 4px;
  background: transparent;
  color: var(--color-primary, #6366F1);
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms;
  font-family: inherit;
  opacity: ${p => p.disabled ? 0.5 : 1};
  &:hover:not(:disabled) {
    background: var(--color-primary, #6366F1);
    color: #fff;
  }
`

/* ── Bottom Bar ── */

const BottomBar = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 6px 8px 8px;
  border-top: 0.5px solid var(--color-border);
`

const BottomBtn = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  color: var(--color-text-3);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  font-size: 9px;
  font-weight: 500;
  font-family: inherit;

  &:hover { background: var(--bg-hover); color: var(--color-text); }
  &:active { transform: scale(0.92); transition-duration: 60ms; }
  .spinning { animation: spin 1s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`

export default RightPanel
