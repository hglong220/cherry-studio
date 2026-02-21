// AIIRC: Gemini 风格 - 去掉所有头部装饰（头像、用户名、时间、token）
import { useChatContext } from '@renderer/hooks/useChatContext'
import type { Assistant, Model, Topic } from '@renderer/types'
import type { Message } from '@renderer/types/newMessage'
import { Checkbox } from 'antd'
import type { FC } from 'react'
import { memo } from 'react'
import styled from 'styled-components'

interface Props {
  message: Message
  assistant: Assistant
  model?: Model
  topic: Topic
  isGroupContextMessage?: boolean
}

const MessageHeader: FC<Props> = memo(({ message, topic }) => {
  const { isMultiSelectMode, selectedMessageIds, handleSelectMessage } = useChatContext(topic)
  const isSelected = selectedMessageIds?.includes(message.id)

  // Gemini 风格：不显示任何头部信息
  if (!isMultiSelectMode) {
    return null
  }

  return (
    <Container className="message-header">
      <Checkbox
        checked={isSelected}
        onChange={(e) => handleSelectMessage(message.id, e.target.checked)}
      />
    </Container>
  )
})

MessageHeader.displayName = 'MessageHeader'

const Container = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  margin-bottom: 4px;
`

export default MessageHeader
