// AIIRC: 顶部导航栏已清空 — 左侧 Sidebar 已承担所有导航功能
import type { Assistant, Topic } from '@renderer/types'
import type { FC } from 'react'

interface Props {
  activeAssistant: Assistant
  activeTopic: Topic
  setActiveTopic: (topic: Topic) => void
  setActiveAssistant: (assistant: Assistant) => void
  position: 'left' | 'right'
  activeTopicOrSession?: 'topic' | 'session'
}

const HeaderNavbar: FC<Props> = () => {
  return null
}

export default HeaderNavbar
