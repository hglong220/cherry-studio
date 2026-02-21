// AIIRC: ChatNavBar 已清空 — 顶部不再显示任何图标
import type { Assistant, Topic } from '@renderer/types'
import type { FC } from 'react'

interface Props {
  activeAssistant: Assistant
  activeTopic: Topic
  setActiveTopic: (topic: Topic) => void
  setActiveAssistant: (assistant: Assistant) => void
  position: 'left' | 'right'
}

const HeaderNavbar: FC<Props> = () => {
  return null
}

export default HeaderNavbar
