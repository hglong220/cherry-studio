/**
 * AIIRC Studio — 探索模式状态条
 * 运行时显示在聊天区顶部（ChatNavbar 下方）
 */
import { PauseCircle, PlayCircle, StopCircle, Telescope } from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import styled, { keyframes } from 'styled-components'

const ExploreStatusBar: FC = () => {
  const [active, setActive] = useState(false)
  const [paused, setPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [success, setSuccess] = useState(0)

  useEffect(() => {
    const handler = ((e: CustomEvent) => {
      setActive(e.detail)
      if (e.detail) {
        setPaused(false)
        setElapsed(0)
        setAttempts(0)
        setSuccess(0)
      }
    }) as EventListener
    window.addEventListener('explore-mode-change', handler)
    return () => window.removeEventListener('explore-mode-change', handler)
  }, [])

  // Timer
  useEffect(() => {
    if (!active || paused) return
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [active, paused])

  // Connect to backend explore SSE when activated
  useEffect(() => {
    if (!active || paused) return
    let aborted = false

    const runExplore = async () => {
      try {
        const res = await fetch('http://localhost:3022/api/explore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: '自主探索当前任务', maxAttempts: 10 })
        })
        if (!res.ok || !res.body) return

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''

        while (!aborted) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const evt = JSON.parse(line.slice(6))
              if (evt.type === 'attempt') setAttempts(evt.attempt)
              if (evt.type === 'success') setSuccess(s => s + 1)
            } catch { /* */ }
          }
        }
      } catch { /* backend not available, timer fallback */ }
    }

    runExplore()
    return () => { aborted = true }
  }, [active, paused])

  const handlePause = () => setPaused(p => !p)
  const handleStop = () => {
    setActive(false)
    window.dispatchEvent(new CustomEvent('explore-mode-change', { detail: false }))
    window.toast.info('探索模式已停止')
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}m ${sec.toString().padStart(2, '0')}s`
  }

  if (!active) return null

  return (
    <Bar>
      <BarLeft>
        <TelescopeIcon className={paused ? '' : 'spinning'} size={13} />
        <BarLabel>{paused ? '已暂停' : '探索中'}</BarLabel>
        <BarMeta>· 已尝试 {attempts} 种方案 · 成功 {success} 种 · {formatTime(elapsed)}</BarMeta>
      </BarLeft>
      <BarRight>
        <BarBtn onClick={handlePause} title={paused ? '继续' : '暂停'}>
          {paused ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
        </BarBtn>
        <BarBtn onClick={handleStop} title="停止" className="stop">
          <StopCircle size={14} />
        </BarBtn>
      </BarRight>
    </Bar>
  )
}

const orbit = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const Bar = styled.div`
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: rgba(99, 102, 241, 0.06);
  border-bottom: 0.5px solid rgba(99, 102, 241, 0.15);
  flex-shrink: 0;
`

const BarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const TelescopeIcon = styled(Telescope)`
  color: var(--color-primary, #6366F1);
  &.spinning { animation: ${orbit} 2s linear infinite; }
`

const BarLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text);
`

const BarMeta = styled.span`
  font-size: 11px;
  color: var(--color-text-3);
`

const BarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const BarBtn = styled.button`
  background: none;
  border: none;
  color: var(--color-text-3);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: color 150ms, background 150ms;
  &:hover { color: var(--color-text); background: rgba(0,0,0,0.05); }
  &.stop:hover { color: #EF4444; }
`

export default ExploreStatusBar
