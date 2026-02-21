import { useNavbarPosition, useSettings } from '@renderer/hooks/useSettings'
import { useShowTopics } from '@renderer/hooks/useStore'
import { EVENT_NAMES, EventEmitter } from '@renderer/services/EventService'
import type { Assistant, Topic } from '@renderer/types'
import type { Tab } from '@renderer/types/chat'
import { classNames } from '@renderer/utils'
import { Tooltip } from 'antd'
import type { FC } from 'react'
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'

import Topics from './TopicsTab'

interface Props {
  activeAssistant: Assistant
  activeTopic: Topic
  setActiveAssistant: (assistant: Assistant) => void
  setActiveTopic: (topic: Topic) => void
  position: 'left' | 'right'
  forceToSeeAllTab?: boolean
  style?: React.CSSProperties
}

let _tab: Tab | null = null

const HomeTabs: FC<Props> = ({
  activeAssistant,
  activeTopic,
  setActiveTopic,
  position,
  forceToSeeAllTab,
  style
}) => {
  const { topicPosition } = useSettings()
  const { toggleShowTopics } = useShowTopics()
  const { isLeftNavbar } = useNavbarPosition()
  const [tab, setTab] = useState<Tab>(position === 'left' ? _tab || 'assistants' : 'topic')

  const border =
    position === 'left'
      ? { borderRight: '0.5px solid var(--color-border)' }
      : { borderLeft: '0.5px solid var(--color-border)', borderTopLeftRadius: 0 }

  if (position === 'left' && topicPosition === 'left') {
    _tab = tab
  }

  const showTab = position === 'left' && topicPosition === 'left'

  useEffect(() => {
    const unsubscribes = [
      EventEmitter.on(EVENT_NAMES.SHOW_ASSISTANTS, (): any => {
        showTab && setTab('assistants')
      }),
      EventEmitter.on(EVENT_NAMES.SHOW_TOPIC_SIDEBAR, (): any => {
        showTab && setTab('topic')
      }),
      EventEmitter.on(EVENT_NAMES.SWITCH_TOPIC_SIDEBAR, () => {
        showTab && setTab('topic')
        if (position === 'left' && topicPosition === 'right') {
          toggleShowTopics()
        }
      })
    ]
    return () => unsubscribes.forEach((unsub) => unsub())
  }, [position, setTab, showTab, tab, toggleShowTopics, topicPosition])

  useEffect(() => {
    if (position === 'right' && topicPosition === 'right' && tab === 'assistants') {
      setTab('topic')
    }
    if (position === 'left' && topicPosition === 'right' && tab === 'topic') {
      setTab('assistants')
    }
  }, [position, tab, topicPosition, forceToSeeAllTab])

  return (
    <Container
      style={{ ...border, ...style }}
      className={classNames('home-tabs', { right: position === 'right' && topicPosition === 'right' })}>
      <TabContent className="home-tabs-content">
        <Topics
          assistant={activeAssistant}
          activeTopic={activeTopic}
          setActiveTopic={setActiveTopic}
          position={position}
        />
      </TabContent>
      {position === 'left' && <MiniStatusFooter />}
    </Container>
  )
}

/* ── 精简状态栏（Apple HIG 风格）── */
interface AgentMini { id: string; status: 'online' | 'busy' | 'offline' }

const MiniStatusFooter: FC = () => {
  const [connected, setConnected] = useState(false)
  const [model, setModel] = useState('--')
  const [tokens, setTokens] = useState('--')
  const [exploreActive, setExploreActive] = useState(false)
  const [agents, setAgents] = useState<AgentMini[]>(
    Array.from({ length: 20 }, (_, i) => ({ id: `agent-${i + 1}`, status: 'offline' as const }))
  )

  const poll = useCallback(async () => {
    try {
      const h = await fetch('http://localhost:3022/health', { signal: AbortSignal.timeout(3000) })
      setConnected(h.ok)
      if (h.ok) {
        try {
          const mr = await fetch('http://localhost:3022/v1/models', { signal: AbortSignal.timeout(3000) })
          if (mr.ok) { const d = await mr.json(); setModel(d?.data?.[0]?.id || 'GPT-4o') }
        } catch { /* */ }
        try {
          const tr = await fetch('http://localhost:3022/api/usage', { signal: AbortSignal.timeout(3000) })
          if (tr.ok) {
            const d = await tr.json()
            const t = d?.today?.totalTokens || d?.totalTokens || 0
            setTokens(t > 1000 ? `${(t / 1000).toFixed(1)}k` : String(t))
          }
        } catch { /* */ }
      } else {
        setModel('--')
        setTokens('--')
      }
    } catch {
      setConnected(false)
      setModel('--')
      setTokens('--')
    }

    const checks: Promise<AgentMini>[] = []
    for (let i = 1; i <= 6; i++) {
      const port = i === 1 ? 3011 : 4010 + i
      checks.push(
        fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(1500) })
          .then(r => ({ id: `agent-${i}`, status: (r.ok ? 'online' : 'offline') as 'online' | 'offline' }))
          .catch(() => ({ id: `agent-${i}`, status: 'offline' as const }))
      )
    }
    const results = await Promise.all(checks)
    setAgents(results.concat(
      Array.from({ length: 14 }, (_, i) => ({ id: `agent-${i + 7}`, status: 'offline' as const }))
    ))
  }, [])

  useEffect(() => {
    poll()
    const t = setInterval(poll, 15000)
    return () => clearInterval(t)
  }, [poll])

  useEffect(() => {
    const handler = ((e: CustomEvent) => setExploreActive(e.detail)) as EventListener
    window.addEventListener('explore-mode-change', handler)
    return () => window.removeEventListener('explore-mode-change', handler)
  }, [])

  const onlineCount = agents.filter(a => a.status === 'online' || a.status === 'busy').length

  return (
    <StatusFooter>
      <StatusLine>
        <StatusDot $on={connected} />
        <StatusText>{connected ? '已连接' : '离线'}</StatusText>
        <StatusSep />
        <ModelText>{model}</ModelText>
      </StatusLine>
      <InfoLine>
        <InfoItem>⚡ {tokens}</InfoItem>
        {exploreActive && <ExploreTag>🔭 探索中</ExploreTag>}
      </InfoLine>
      <AgentGrid>
        {agents.map(a => (
          <Tooltip key={a.id} title={`${a.id} · ${a.status === 'online' ? '空闲' : '离线'}`} placement="top" mouseEnterDelay={0.4}>
            <AgentCell $status={a.status} />
          </Tooltip>
        ))}
      </AgentGrid>
      <AgentSummary>{onlineCount} 在线 · {20 - onlineCount} 离线</AgentSummary>
    </StatusFooter>
  )
}

/* ── Styled Components ── */

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: var(--assistants-width);
  transition: width 0.3s;
  height: calc(100vh - var(--navbar-height));
  position: relative;
  background-color: var(--color-background-soft);

  &.right {
    height: calc(100vh - var(--navbar-height));
  }

  [navbar-position='top'] & {
    height: calc(100vh - var(--navbar-height));
  }
  overflow: hidden;
  .collapsed {
    width: 0;
    border-left: none;
  }
`

const TabContent = styled.div`
  display: flex;
  transition: width 0.3s;
  flex: 1;
  flex-direction: column;
  overflow-y: hidden;
  overflow-x: hidden;
`

/* ── Apple HIG 状态栏 ── */
const StatusFooter = styled.div`
  flex-shrink: 0;
  padding: 10px 14px 10px;
  border-top: 0.5px solid var(--color-border);
`

const StatusLine = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 8px;
`

const StatusText = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-2);
  letter-spacing: -0.01em;
`

const ModelText = styled.span`
  font-size: 10px;
  font-weight: 400;
  color: var(--color-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`

const StatusSep = styled.span`
  width: 1px;
  height: 10px;
  background: var(--color-border);
  flex-shrink: 0;
`

const StatusDot = styled.span<{ $on: boolean }>`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $on }) => $on ? '#34c759' : '#ff3b30'};
  ${({ $on }) => $on && 'box-shadow: 0 0 3px rgba(52, 199, 89, 0.5);'}
`

const AgentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 3px;
  padding: 0 4px;
  justify-items: center;
`

const AgentCell = styled.span<{ $status: string }>`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ $status }) =>
    $status === 'online' ? '#34c759' :
      $status === 'busy' ? '#ff9500' :
        'var(--color-border)'};
  opacity: ${({ $status }) => $status === 'offline' ? 0.3 : 1};
  transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
`

const InfoLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
`

const InfoItem = styled.span`
  font-size: 10px;
  color: var(--color-text-3);
`

const ExploreTag = styled.span`
  font-size: 9px;
  font-weight: 500;
  color: var(--color-primary, #6366F1);
  background: rgba(99, 102, 241, 0.08);
  padding: 1px 5px;
  border-radius: 3px;
`

const AgentSummary = styled.div`
  font-size: 10px;
  font-weight: 400;
  color: var(--color-text-3);
  text-align: center;
  margin-top: 5px;
  letter-spacing: 0.02em;
  opacity: 0.7;
`

export default HomeTabs
