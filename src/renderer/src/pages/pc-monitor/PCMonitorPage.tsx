import { Laptop, Monitor, Cloud, Wifi, RefreshCw, Plus } from 'lucide-react'
import type { FC } from 'react'
import styled from 'styled-components'

interface PCInfo {
  id: string
  name: string
  type: 'local' | 'physical' | 'virtual'
  status: 'online' | 'busy' | 'offline'
  ip?: string
  task?: string
  lastSeen?: string
}

const MOCK_PCS: PCInfo[] = [
  { id: '1', name: '本机', type: 'local', status: 'online', ip: '127.0.0.1' },
  { id: '2', name: 'PC-2', type: 'physical', status: 'busy', ip: '192.168.1.102', task: '分析数据中' },
  { id: '3', name: 'PC-3', type: 'physical', status: 'offline', ip: '192.168.1.108' },
  { id: '4', name: 'VM-1', type: 'virtual', status: 'online', ip: '10.0.0.11' },
  { id: '5', name: 'VM-2', type: 'virtual', status: 'busy', ip: '10.0.0.12', task: '爬取网页中' },
  { id: '6', name: 'VM-3', type: 'virtual', status: 'online', ip: '10.0.0.13' }
]

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'local': return <Laptop size={14} />
    case 'physical': return <Monitor size={14} />
    case 'virtual': return <Cloud size={14} />
    default: return <Monitor size={14} />
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'local': return '本机'
    case 'physical': return '实体'
    case 'virtual': return '虚拟'
    default: return type
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'online': return '在线'
    case 'busy': return '忙碌'
    case 'offline': return '离线'
    default: return status
  }
}

const PCMonitorPage: FC = () => {
  return (
    <Container>
      <Header>
        <HeaderLeft>
          <Monitor size={20} style={{ color: 'var(--color-primary)' }} />
          <Title>电脑控制台</Title>
          <CountBadge>{MOCK_PCS.length} 台</CountBadge>
        </HeaderLeft>
        <HeaderRight>
          <IconBtn title="扫描局域网">
            <Wifi size={16} />
          </IconBtn>
          <IconBtn title="刷新">
            <RefreshCw size={16} />
          </IconBtn>
        </HeaderRight>
      </Header>

      <CardGrid>
        {MOCK_PCS.map(pc => (
          <PCCard key={pc.id}>
            <CardScreen>
              <ScreenPlaceholder>
                {getTypeIcon(pc.type)}
              </ScreenPlaceholder>
              <StatusDot $status={pc.status} />
            </CardScreen>
            <CardInfo>
              <CardInfoLeft>
                <PCName>{pc.name}</PCName>
                <PCMeta>
                  {getStatusLabel(pc.status)}
                  {pc.task && ` · ${pc.task}`}
                </PCMeta>
              </CardInfoLeft>
              <TypeBadge $type={pc.type}>
                {getTypeLabel(pc.type)}
              </TypeBadge>
            </CardInfo>
          </PCCard>
        ))}
      </CardGrid>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 20px;
  border-bottom: 0.5px solid var(--color-border);
  flex-shrink: 0;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const Title = styled.h1`
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--color-text);
  margin: 0;
`

const CountBadge = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-background-mute);
  padding: 3px 8px;
  border-radius: 6px;
`

const HeaderRight = styled.div`
  display: flex;
  gap: 8px;
`

const ActionBtnPrimary = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 150ms ease;
  &:hover {
    opacity: 0.9;
  }
`

const IconBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  &:hover {
    background: var(--bg-hover);
    color: var(--color-text);
  }
  &:active {
    transform: scale(0.92);
    transition-duration: 60ms;
  }
`

const CardGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 20px;
  overflow-y: auto;
  align-content: flex-start;
`

const PCCard = styled.div`
  width: 200px;
  border: 0.5px solid var(--color-border);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.2, 0, 0, 1),
              box-shadow 0.25s cubic-bezier(0.2, 0, 0, 1);
  background: var(--color-background-soft);
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }
  &:active {
    transform: scale(0.97);
    transition-duration: 60ms;
  }
`

const CardScreen = styled.div`
  width: 100%;
  aspect-ratio: 16/10;
  background: var(--color-background);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ScreenPlaceholder = styled.div`
  color: var(--color-text-3);
  transform: scale(2);
`

const StatusDot = styled.div<{ $status: string }>`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $status }) =>
    $status === 'online' ? 'var(--color-status-success)' :
      $status === 'busy' ? 'var(--color-primary)' :
        'var(--color-text-3)'};
  box-shadow: ${({ $status }) =>
    $status === 'online' ? '0 0 6px var(--color-status-success)' :
      $status === 'busy' ? '0 0 6px var(--color-primary)' :
        'none'};
`

const CardInfo = styled.div`
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const CardInfoLeft = styled.div`
  display: flex;
  flex-direction: column;
`

const PCName = styled.span`
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.006em;
  color: var(--color-text);
`

const PCMeta = styled.span`
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
`

const TypeBadge = styled.span<{ $type: string }>`
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 6px;
  background: ${({ $type }) =>
    $type === 'local' ? 'var(--color-primary-mute)' :
      $type === 'physical' ? 'rgba(34, 197, 94, 0.12)' :
        'rgba(59, 130, 246, 0.12)'};
  color: ${({ $type }) =>
    $type === 'local' ? 'var(--color-primary)' :
      $type === 'physical' ? '#22C55E' :
        '#3B82F6'};
`

const AddCard = styled.div`
  width: 200px;
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  aspect-ratio: 16/12;
  transition: border-color 150ms;
  &:hover {
    border-color: var(--color-primary);
  }
`

const AddCardText = styled.span`
  font-size: 12px;
  color: var(--color-text-3);
  margin-top: 8px;
`

export default PCMonitorPage
