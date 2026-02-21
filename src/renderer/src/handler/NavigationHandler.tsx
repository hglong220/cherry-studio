// NavigationHandler — 设置面板已删除，此组件仅保留 macOS 菜单事件处理
import { IpcChannel } from '@shared/IpcChannel'
import { useEffect } from 'react'

const NavigationHandler: React.FC = () => {
  // macOS 菜单的 "关于" 事件 — 设置面板已不存在，忽略
  useEffect(() => {
    const handleNavigateToAbout = () => {
      // No-op: settings panel removed
    }

    const removeListener = window.electron.ipcRenderer.on(IpcChannel.Windows_NavigateToAbout, handleNavigateToAbout)

    return () => {
      removeListener()
    }
  }, [])

  return null
}

export default NavigationHandler
