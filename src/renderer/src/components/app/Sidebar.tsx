/**
 * AIIRC Studio — 侧边栏
 * 56px 图标模式，参考 VS Code Activity Bar + Linear 侧栏
 *
 * 顶部区域：对话 / 电脑控制台 / 探索模式
 * 底部区域：面板切换 / 主题 / 用户头像（含设置入口）
 *
 * 没有独立的设置图标 — 设置通过头像菜单进入
 * 头像菜单参考 Claude.ai 的下拉菜单结构
 */
import EmojiAvatar from '@renderer/components/Avatar/EmojiAvatar'
import { isMac } from '@renderer/config/constant'
import { UserAvatar } from '@renderer/config/env'
import { useTheme } from '@renderer/context/ThemeProvider'
import useAvatar from '@renderer/hooks/useAvatar'
import { useFullscreen } from '@renderer/hooks/useFullscreen'
import { useAllProviders, useProviders } from '@renderer/hooks/useProvider'
import { modelGenerating, useRuntime } from '@renderer/hooks/useRuntime'
import { useSettings } from '@renderer/hooks/useSettings'
import i18n from '@renderer/i18n'
import AddProviderPopup from '@renderer/pages/settings/ProviderSettings/AddProviderPopup'
import ImageStorage from '@renderer/services/ImageStorage'
import { useAppDispatch } from '@renderer/store'
import { setLanguage } from '@renderer/store/settings'
import type { LanguageVarious, Provider } from '@renderer/types'
import { ThemeMode, isSystemProvider } from '@renderer/types'
import { isEmoji, getFancyProviderName, uuid } from '@renderer/utils'
import { Avatar, Dropdown, Input, Modal, Switch } from 'antd'
import type { MenuProps } from 'antd'
import {
  Cpu,
  Globe,
  HelpCircle,
  Laptop,
  LogOut,
  MessageSquare,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Telescope
} from 'lucide-react'
import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

interface SidebarProps {
  onPanelToggle?: () => void
}

const Sidebar: FC<SidebarProps> = ({ onPanelToggle }) => {
  const { minappShow } = useRuntime()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { settedTheme, toggleTheme } = useTheme()
  const avatar = useAvatar()
  const { t } = useTranslation()
  const isFullscreen = useFullscreen()
  const { userName } = useSettings()
  const dispatch = useAppDispatch()
  const providers = useAllProviders()
  const { updateProvider, addProvider } = useProviders()

  const to = async (path: string) => {
    await modelGenerating()
    navigate(path)
  }

  const switchLanguage = (lang: LanguageVarious) => {
    dispatch(setLanguage(lang))
    localStorage.setItem('language', lang)
    window.api.setLanguage(lang)
    i18n.changeLanguage(lang)
  }

  const onToggleProvider = (provider: Provider, enabled: boolean) => {
    updateProvider({ ...provider, enabled })
  }

  const onEditProvider = (provider: Provider) => {
    let apiKeyValue = provider.apiKey || ''
    let enabledValue = provider.enabled
    Modal.confirm({
      title: getFancyProviderName(provider),
      icon: null,
      width: 400,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 4 }}>API Key</div>
            <Input.Password
              defaultValue={provider.apiKey}
              placeholder="sk-..."
              onChange={(e) => { apiKeyValue = e.target.value }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13 }}>启用</span>
            <Switch
              defaultChecked={provider.enabled}
              onChange={(checked) => { enabledValue = checked }}
            />
          </div>
        </div>
      ),
      okText: '保存',
      cancelText: '取消',
      onOk: () => {
        updateProvider({ ...provider, apiKey: apiKeyValue, enabled: enabledValue })
      }
    })
  }

  const onAddProvider = async () => {
    const { name: providerName, type, logo } = await AddProviderPopup.show()
    if (!providerName.trim()) return
    const provider = {
      id: uuid(),
      name: providerName.trim(),
      type,
      apiKey: '',
      apiHost: '',
      models: [],
      enabled: true,
      isSystem: false
    } as Provider
    if (logo) {
      try { await ImageStorage.set(`provider-${provider.id}`, logo) } catch { /* ignore */ }
    }
    addProvider(provider)
  }

  const isRoute = (p: string) => pathname === p && !minappShow
  const isRoutes = (p: string) => pathname.startsWith(p) && !minappShow

  // 只保留核心 + 自定义（用户添加的）
  const coreProviderIds = ['aiirc', 'openai', 'anthropic', 'gemini', 'deepseek']
  const visibleProviders = providers.filter((p) =>
    coreProviderIds.includes(p.id) || !isSystemProvider(p)
  )

  // 构建 providers 子菜单
  const providerItems: MenuProps['items'] = visibleProviders.map((provider) => ({
    key: `provider-${provider.id}`,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <span>{getFancyProviderName(provider)}</span>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: provider.enabled ? 'var(--aiirc-success, #30D158)' : 'var(--color-gray-3, #48484A)'
        }} />
      </span>
    ),
    onClick: () => onEditProvider(provider)
  }))

  const providerChildren: MenuProps['items'] = [
    ...providerItems,
    { type: 'divider' },
    {
      key: 'add-custom',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--brand-primary, #6366F1)' }}>
          <Plus size={14} />
          添加自定义
        </span>
      ),
      onClick: onAddProvider
    }
  ]

  // Claude 风格头像下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'user-identity',
      label: (
        <span style={{ fontWeight: 500, fontSize: 13.5, color: 'var(--color-text-1)' }}>
          {userName || 'AIIRC User'}
        </span>
      ),
      disabled: true,
      style: { cursor: 'default', opacity: 1, padding: '6px 12px' }
    },
    { type: 'divider' },
    {
      key: 'models',
      label: '模型',
      icon: <Cpu size={15} />,
      popupOffset: [0, 130],
      children: providerChildren
    },
    {
      key: 'language',
      label: t('common.language', '语言'),
      icon: <Globe size={15} />,
      popupOffset: [0, 130],
      children: [
        { key: 'lang-zh-CN', label: '🇨🇳 简体中文', onClick: () => switchLanguage('zh-CN') },
        { key: 'lang-zh-TW', label: '🇹🇼 繁體中文', onClick: () => switchLanguage('zh-TW') },
        { key: 'lang-en-US', label: '🇺🇸 English', onClick: () => switchLanguage('en-US') },
        { key: 'lang-ja-JP', label: '🇯🇵 日本語', onClick: () => switchLanguage('ja-JP') },
        { key: 'lang-fr-FR', label: '🇫🇷 Français', onClick: () => switchLanguage('fr-FR') },
        { key: 'lang-de-DE', label: '🇩🇪 Deutsch', onClick: () => switchLanguage('de-DE') },
        { key: 'lang-es-ES', label: '🇪🇸 Español', onClick: () => switchLanguage('es-ES') },
        { key: 'lang-ru-RU', label: '🇷🇺 Русский', onClick: () => switchLanguage('ru-RU') },
        { key: 'lang-pt-PT', label: '🇵🇹 Português', onClick: () => switchLanguage('pt-PT') }
      ]
    },
    {
      key: 'help',
      label: t('settings.about.feedback.title', '获取帮助'),
      icon: <HelpCircle size={15} />,
      onClick: () => window.api?.openWebsite?.('https://docs.cherry-ai.com/')
    },
    { type: 'divider' },
    {
      key: 'plans',
      label: '查看所有方案',
      icon: <Sparkles size={15} />
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogOut size={15} />,
      danger: true
    }
  ]

  return (
    <Container $isFullscreen={isFullscreen} id="app-sidebar">
      {/* 主功能区 - 顶部 */}
      <MainSection>
        <NavItem active={isRoute('/')} onClick={() => to('/')} label={t('chat.title', '对话')}>
          <MessageSquare size={20} />
        </NavItem>
        <NavItem active={false} onClick={() => onPanelToggle?.()} label="监控台">
          <Laptop size={20} />
        </NavItem>
        <NavItem active={false} onClick={() => {
          Modal.confirm({
            title: '开启探索模式',
            icon: null,
            width: 440,
            content: (
              <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.7 }}>
                <p>探索模式下 AI 将完全自主运行，不依赖你的引导。这可能消耗大量 API Token。</p>
                <p style={{ marginTop: 8 }}>建议：</p>
                <ul style={{ paddingLeft: 18, margin: '4px 0' }}>
                  <li>接入本地 Ollama 模型（无 API 费用）</li>
                  <li>或在设置中设置用量上限</li>
                </ul>
              </div>
            ),
            okText: '了解风险，开启探索',
            cancelText: '取消',
            onOk: () => {
              window.dispatchEvent(new CustomEvent('explore-mode-change', { detail: true }))
              window.toast.success('探索模式已开启')
            }
          })
        }} label="探索模式">
          <Telescope size={20} />
        </NavItem>
      </MainSection>

      {/* 分隔线 */}
      <SidebarDivider />

      {/* 底部辅助区 */}
      <BottomSection>

        <NavItem
          active={false}
          onClick={toggleTheme}
          label={settedTheme === ThemeMode.dark ? '深色' : '浅色'}
        >
          {settedTheme === ThemeMode.dark ? (
            <Moon size={20} />
          ) : (
            <Sun size={20} />
          )}
        </NavItem>

        {/* 用户头像 — 最底部，Claude 风格菜单 */}
        <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="topRight">
          <AvatarWrapper>
            {isEmoji(avatar) ? (
              <EmojiAvatar size={32} fontSize={18}>
                {avatar}
              </EmojiAvatar>
            ) : (
              <AvatarImg src={avatar || UserAvatar} draggable={false} />
            )}
          </AvatarWrapper>
        </Dropdown>
      </BottomSection>
    </Container>
  )
}

/* ── NavItem 组件 ──────────────────────────────────────────────── */
interface NavItemProps {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  label: string
}

const NavItem: FC<NavItemProps> = ({ children, active, onClick, label }) => (
  <NavItemButton className={active ? 'active' : ''} onClick={onClick} title={label}>
    {children}
  </NavItemButton>
)

/* ── Styled Components ─────────────────────────────────────────── */

const Container = styled.div<{ $isFullscreen: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${isMac ? '12px' : '16px'} 0 16px;
  width: 56px;
  min-width: 56px;
  height: ${({ $isFullscreen }) => (isMac && !$isFullscreen ? 'calc(100% - var(--navbar-height, 0px))' : '100%')};
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-subtle);
  -webkit-app-region: drag !important;
  margin-top: ${({ $isFullscreen }) => (isMac && !$isFullscreen ? 'env(titlebar-area-height)' : 0)};
  z-index: 50;
`

const MainSection = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding-top: ${isMac ? '4px' : '8px'};
`

const BottomSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`

const SidebarDivider = styled.div`
  width: 24px;
  height: 1px;
  background: var(--border-subtle);
  margin: 6px 0;
  opacity: 0.6;
`

const NavItemButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-icon);
  transition: color 0.2s cubic-bezier(0.2, 0, 0, 1),
              background 0.2s cubic-bezier(0.2, 0, 0, 1),
              transform 60ms;
  position: relative;
  border: none;
  background: transparent;
  -webkit-app-region: no-drag;
  padding: 0;

  &:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  &:active {
    transform: scale(0.92);
  }

  &.active {
    color: var(--color-primary);
    background: var(--color-primary-mute);
  }
`

const AvatarWrapper = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-app-region: no-drag;
  border-radius: 10px;
  transition: opacity 0.2s cubic-bezier(0.2, 0, 0, 1),
              transform 60ms;
  margin-top: 8px;

  &:hover {
    opacity: 0.8;
  }

  &:active {
    transform: scale(0.92);
  }
`

const AvatarImg = styled(Avatar)`
  width: 32px;
  height: 32px;
  background-color: var(--bg-elevated);
  border: none;
  cursor: pointer;
`

export default Sidebar
