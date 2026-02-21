/**
 * AIIRC Studio — 底部状态栏
 * 左：附件、网络、保存 | 右：探索模式、API 用量
 * 参考：VS Code / Cursor 底部状态栏
 */
import { Tooltip } from 'antd'
import { Globe, Paperclip, Save, Telescope, Zap } from 'lucide-react'
import type { FC } from 'react'
import { useState } from 'react'
import styled from 'styled-components'

interface StatusBarProps {
    onExploreToggle?: () => void
    exploreActive?: boolean
    tokenCount?: number
}

const StatusBar: FC<StatusBarProps> = ({ onExploreToggle, exploreActive = false, tokenCount = 0 }) => {
    const formatTokens = (n: number) => {
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
        return String(n)
    }

    return (
        <Container className="aiirc-statusbar">
            {/* Left side tools */}
            <Tooltip title="附件" placement="top" mouseEnterDelay={0.5}>
                <StatusBtn>
                    <Paperclip size={14} />
                    <span>附件</span>
                </StatusBtn>
            </Tooltip>
            <Tooltip title="网络" placement="top" mouseEnterDelay={0.5}>
                <StatusBtn>
                    <Globe size={14} />
                    <span>网络</span>
                </StatusBtn>
            </Tooltip>
            <Tooltip title="保存" placement="top" mouseEnterDelay={0.5}>
                <StatusBtn>
                    <Save size={14} />
                    <span>保存</span>
                </StatusBtn>
            </Tooltip>

            {/* Right side */}
            <RightSection>
                <Tooltip title={exploreActive ? '关闭探索模式' : '开启探索模式'} placement="top">
                    <StatusBtn className={exploreActive ? 'active' : ''} onClick={onExploreToggle}>
                        <Telescope size={14} className={exploreActive ? 'aiirc-icon-spinning' : ''} />
                        <span>探索 {exploreActive ? 'ON' : 'OFF'}</span>
                    </StatusBtn>
                </Tooltip>
                <Tooltip title="API 用量" placement="top">
                    <StatusBtn>
                        <Zap size={14} />
                        <span>{formatTokens(tokenCount)}</span>
                    </StatusBtn>
                </Tooltip>
            </RightSection>
        </Container>
    )
}

const Container = styled.div`
  height: var(--statusbar-height, 28px);
  background: var(--bg-app);
  border-top: 0.5px solid var(--border-subtle);
  padding: 0 var(--space-3, 12px);
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  font-family: var(--font-sans);
`

const StatusBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  height: 100%;
  padding: 0 8px;
  font-size: 11px;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s cubic-bezier(0.2, 0, 0, 1),
              background 0.2s cubic-bezier(0.2, 0, 0, 1);
  border: none;
  background: none;
  font-family: inherit;
  border-radius: 4px;

  &:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  &:active {
    transform: scale(0.96);
    transition-duration: 60ms;
  }

  &.active {
    color: var(--brand-primary);
    background: var(--brand-subtle);
  }
`

const RightSection = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  height: 100%;
`

export default StatusBar
