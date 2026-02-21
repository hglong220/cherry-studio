// AIIRC: 设置页 - 浮动弹窗风格
// 只保留模型服务（Provider）
import { Cloud } from 'lucide-react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { Route, Routes, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { ProviderList } from './ProviderSettings'

const SettingsPage: FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Backdrop onClick={() => navigate('/')}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalHeaderLeft>
            <Cloud size={16} style={{ color: 'var(--color-text-2)' }} />
            <ModalTitle>{t('settings.provider.title', '模型')}</ModalTitle>
          </ModalHeaderLeft>
          <CloseButton onClick={() => navigate('/')}>✕</CloseButton>
        </ModalHeader>
        <ContentContainer id="content-container">
          <Routes>
            <Route path="*" element={<ProviderList />} />
          </Routes>
        </ContentContainer>
      </ModalContainer>
    </Backdrop>
  )
}

const Backdrop = styled.div`
  position: fixed;
  top: 0;
  left: 56px;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  -webkit-app-region: no-drag;
  animation: fadeIn 250ms cubic-bezier(0.2, 0, 0, 1);
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

const ModalContainer = styled.div`
  width: 80%;
  height: 70%;
  max-width: 520px;
  max-height: 480px;
  background: var(--bg-surface, var(--color-background));
  border: 0.5px solid var(--border-subtle, var(--color-border));
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.3),
              0 0 0 0.5px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1);
  @keyframes slideUp {
    from { transform: translateY(16px) scale(0.97); opacity: 0; }
    to { transform: translateY(0) scale(1); opacity: 1; }
  }
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: transparent;
  flex-shrink: 0;
  border-bottom: 0.5px solid var(--color-border-soft);
`

const ModalHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const ModalTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
`

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  color: var(--color-text-3);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  &:hover {
    background: var(--bg-hover);
    color: var(--color-text);
  }
  &:active {
    transform: scale(0.9);
    transition-duration: 60ms;
  }
`

const ContentContainer = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`

export default SettingsPage
