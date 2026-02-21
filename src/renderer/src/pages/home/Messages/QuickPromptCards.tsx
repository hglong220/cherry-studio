/**
 * AIIRC Studio — 空对话引导卡片
 * 当消息列表为空时显示 3 个快捷指令卡片
 */
import { EVENT_NAMES, EventEmitter } from '@renderer/services/EventService'
import { Laptop, Settings2, Telescope } from 'lucide-react'
import type { FC } from 'react'
import styled from 'styled-components'

const QUICK_PROMPTS = [
    {
        icon: Laptop,
        title: '帮我控制电脑完成任务',
        desc: '操作文件、打开应用、执行命令',
        prompt: '帮我打开桌面上的浏览器，搜索今天的天气'
    },
    {
        icon: Telescope,
        title: '开启探索，自动寻找方案',
        desc: 'AI 自主研究、尝试、验证',
        prompt: '请帮我探索如何在 Ubuntu 上搭建 Nginx 并配置 HTTPS'
    },
    {
        icon: Settings2,
        title: '配置我的 AI 模型',
        desc: '选择模型、设置参数',
        prompt: '帮我查看当前配置了哪些 AI 模型，以及它们的状态'
    }
]

const QuickPromptCards: FC = () => {
    const handleClick = (prompt: string) => {
        // Emit a message send event with the prompt text
        EventEmitter.emit(EVENT_NAMES.SEND_MESSAGE, { content: prompt })
    }

    return (
        <CardsContainer>
            <BrandMark>⚡</BrandMark>
            <BrandTitle>AIIRC Studio</BrandTitle>
            <BrandSub>今天想完成什么任务？</BrandSub>
            <CardsRow>
                {QUICK_PROMPTS.map((item, i) => (
                    <Card key={i} onClick={() => handleClick(item.prompt)}>
                        <item.icon size={16} color="var(--color-primary, #6366F1)" />
                        <CardTitle>{item.title}</CardTitle>
                        <CardDesc>{item.desc}</CardDesc>
                    </Card>
                ))}
            </CardsRow>
        </CardsContainer>
    )
}

const CardsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 40px 20px;
  gap: 4px;
`

const BrandMark = styled.div`
  font-size: 36px;
  margin-bottom: 4px;
  opacity: 0.3;
`

const BrandTitle = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text);
  letter-spacing: -0.02em;
`

const BrandSub = styled.div`
  font-size: 13px;
  color: var(--color-text-3);
  margin-bottom: 24px;
`

const CardsRow = styled.div`
  display: flex;
  gap: 10px;
  max-width: 560px;
  width: 100%;
`

const Card = styled.div`
  flex: 1;
  border: 0.5px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
  transition: border-color 150ms, background 150ms, transform 80ms;

  &:hover {
    border-color: var(--color-primary, #6366F1);
    background: rgba(99, 102, 241, 0.04);
  }
  &:active {
    transform: scale(0.98);
  }
`

const CardTitle = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  margin-top: 8px;
`

const CardDesc = styled.div`
  font-size: 11px;
  color: var(--color-text-3);
  margin-top: 4px;
`

export default QuickPromptCards
