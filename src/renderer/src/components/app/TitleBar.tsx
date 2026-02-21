/**
 * AIIRC Studio — 顶部标题栏
 * 参考：Linear / Cursor / Notion 的极简顶栏
 *
 * 左：品牌标识 ⚡ AIIRC Studio
 * 中：可拖拽区域
 * 右：WindowControls
 */
import type { FC } from 'react'
import styled from 'styled-components'

import WindowControls from '../WindowControls'

const TitleBar: FC = () => {
  return (
    <Bar>
      <BrandSection>
        <BrandIcon>⚡</BrandIcon>
        <BrandName>AIIRC Studio</BrandName>
      </BrandSection>

      <DragArea />

      <RightSection>
        <WindowControls />
      </RightSection>
    </Bar>
  )
}

/* ── Styled Components ─────────────────────────────────────────── */

const Bar = styled.div`
  height: 40px;
  min-height: 40px;
  display: flex;
  align-items: center;
  background: var(--bg-sidebar, #111118);
  -webkit-app-region: drag;
  user-select: none;
  z-index: 100;
`

const BrandSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  height: 100%;
  -webkit-app-region: no-drag;
`

const BrandIcon = styled.span`
  font-size: 16px;
  line-height: 1;
`

const BrandName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #F0F0F8);
  letter-spacing: -0.01em;
  white-space: nowrap;
`

const DragArea = styled.div`
  flex: 1;
  height: 100%;
  -webkit-app-region: drag;
`

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 100%;
  -webkit-app-region: no-drag;
`

export default TitleBar
