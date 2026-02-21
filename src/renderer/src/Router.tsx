/**
 * AIIRC Studio — App Shell
 *
 * 布局策略（对标 Manus / ChatGPT / Claude.ai）：
 *
 * ┌────────┬──────────────────────────────────────────┐
 * │SIDEBAR │  MAIN CONTENT (full width)               │
 * │ 56px   │                                          │
 * │        │  ┌─ Header ──────────────────────────┐   │
 * │ [Chat] │  │ ● GPT-4o ▾          [面板] [⚡]  │   │
 * │ [PCs]  │  ├───────────────────────────────────┤   │
 * │ [Expl] │  │                                   │   │
 * │  ---   │  │     Chat / PC Monitor / etc       │   │
 * │ [Set]  │  │     (centered, max-w: 720px)      │   │
 * │ [Moon] │  │                                   │   │
 * │        │  ├───────────────────────────────────┤   │
 * │        │  │  [Input area]                     │   │
 * │        │  └───────────────────────────────────┘   │
 * └────────┴──────────────────────────────────────────┘
 *
 * 右侧面板按需滑出（点击 Header 的面板图标）
 * 没有底部状态栏 — 状态信息集成到 Header
 */
import '@renderer/databases'

import type { FC } from 'react'
import { useState } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import styled from 'styled-components'

import RightPanel from './components/app/RightPanel'
import Sidebar from './components/app/Sidebar'
import TitleBar from './components/app/TitleBar'
import { ErrorBoundary } from './components/ErrorBoundary'
import NavigationHandler from './handler/NavigationHandler'
import HomePage from './pages/home/HomePage'


const AppShell: FC = () => {
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <ShellContainer>
      <TitleBar />
      <BodyRow>
        <Sidebar onPanelToggle={() => setPanelOpen((p) => !p)} />
        <MainArea>
          <MainContent>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<HomePage />} />

              </Routes>
            </ErrorBoundary>
          </MainContent>
          {/* 面板按需滑出 */}
          {panelOpen && (
            <PanelSlider>
              <RightPanel />
            </PanelSlider>
          )}
        </MainArea>
      </BodyRow>
      <NavigationHandler />
    </ShellContainer>
  )
}

const Router: FC = () => {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  )
}

/* ── Styled Components ─────────────────────────────────────────── */

const ShellContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: var(--bg-app);
  font-family: var(--font-sans);
`

const BodyRow = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;
  min-height: 0;
`

const MainArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: row;
  min-width: 0;
  position: relative;
`

const MainContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const PanelSlider = styled.div`
  width: 220px;
  min-width: 220px;
  animation: slideInPanel 200ms cubic-bezier(0.2, 0, 0, 1);
  border-left: 0.5px solid var(--border-subtle);

  @keyframes slideInPanel {
    from {
      transform: translateX(20px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`

export default Router
