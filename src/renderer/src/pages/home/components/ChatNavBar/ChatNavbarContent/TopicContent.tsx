import type { Assistant } from '@renderer/types'

import Tools from '../Tools'

type TopicContentProps = {
  assistant: Assistant
}

const TopicContent = ({ assistant }: TopicContentProps) => {
  return (
    <>
      {/* AIIRC: 模型选择已移到底部输入框 */}
      <Tools assistant={assistant} />
    </>
  )
}

export default TopicContent
