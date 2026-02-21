import { loggerService } from '@logger'
import {
  isAutoEnableImageGenerationModel,
  isGenerateImageModel,
  isGenerateImageModels,
  isMandatoryWebSearchModel,
  isVisionModel,
  isVisionModels,
  isWebSearchModel
} from '@renderer/config/models'
import db from '@renderer/databases'
import { useAssistant } from '@renderer/hooks/useAssistant'
import { useInputText } from '@renderer/hooks/useInputText'
import { useMessageOperations, useTopicLoading } from '@renderer/hooks/useMessageOperations'
import { useSettings } from '@renderer/hooks/useSettings'
import { useShortcut } from '@renderer/hooks/useShortcuts'
import { useTextareaResize } from '@renderer/hooks/useTextareaResize'
import { useTimer } from '@renderer/hooks/useTimer'
import {
  InputbarToolsProvider,
  useInputbarToolsDispatch,
  useInputbarToolsInternalDispatch,
  useInputbarToolsState
} from '@renderer/pages/home/Inputbar/context/InputbarToolsProvider'
import { getDefaultTopic } from '@renderer/services/AssistantService'
import { CacheService } from '@renderer/services/CacheService'
import { EVENT_NAMES, EventEmitter } from '@renderer/services/EventService'
import FileManager from '@renderer/services/FileManager'
import { checkRateLimit, getUserMessage } from '@renderer/services/MessagesService'
import { spanManagerService } from '@renderer/services/SpanManagerService'
import { estimateTextTokens as estimateTxtTokens, estimateUserPromptUsage } from '@renderer/services/TokenService'
import WebSearchService from '@renderer/services/WebSearchService'
import { useAppDispatch, useAppSelector } from '@renderer/store'
import { sendMessage as _sendMessage } from '@renderer/store/thunk/messageThunk'
import {
  type Assistant,
  type FileMetadata,
  type KnowledgeBase,
  type Model,
  type Topic,
  TopicType
} from '@renderer/types'
import type { MessageInputBaseParams } from '@renderer/types/newMessage'
import { delay } from '@renderer/utils'
import { getSendMessageShortcutLabel } from '@renderer/utils/input'
import { documentExts, imageExts, textExts } from '@shared/config/constant'
import { debounce } from 'lodash'
import type { FC } from 'react'
import React, { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { ChevronDown } from 'lucide-react'

import { InputbarCore } from './components/InputbarCore'
import InputbarTools from './InputbarTools'
import KnowledgeBaseInput from './KnowledgeBaseInput'
import MentionModelsInput from './MentionModelsInput'
import { getInputbarConfig } from './registry'
import TokenCount from './TokenCount'
import { SelectModelPopup } from '@renderer/components/Popups/SelectModelPopup'
import { isEmbeddingModel, isRerankModel } from '@renderer/config/models'

const logger = loggerService.withContext('Inputbar')

const INPUTBAR_DRAFT_CACHE_KEY = 'inputbar-draft'
const DRAFT_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

const getMentionedModelsCacheKey = (assistantId: string) => `inputbar-mentioned-models-${assistantId}`

const getValidatedCachedModels = (assistantId: string): Model[] => {
  const cached = CacheService.get<Model[]>(getMentionedModelsCacheKey(assistantId))
  if (!Array.isArray(cached)) return []
  return cached.filter((model) => model?.id && model?.name)
}

interface Props {
  assistant: Assistant
  setActiveTopic: (topic: Topic) => void
  topic: Topic
}

type ProviderActionHandlers = {
  resizeTextArea: () => void
  addNewTopic: () => void
  clearTopic: () => void
  onNewContext: () => void
  onTextChange: (updater: string | ((prev: string) => string)) => void
  toggleExpanded: (nextState?: boolean) => void
}

interface InputbarInnerProps extends Props {
  actionsRef: React.RefObject<ProviderActionHandlers>
}

const Inputbar: FC<Props> = ({ assistant: initialAssistant, setActiveTopic, topic }) => {
  const actionsRef = useRef<ProviderActionHandlers>({
    resizeTextArea: () => { },
    addNewTopic: () => { },
    clearTopic: () => { },
    onNewContext: () => { },
    onTextChange: () => { },
    toggleExpanded: () => { }
  })

  const [initialMentionedModels] = useState(() => getValidatedCachedModels(initialAssistant.id))

  const initialState = useMemo(
    () => ({
      files: [] as FileMetadata[],
      mentionedModels: initialMentionedModels,
      selectedKnowledgeBases: initialAssistant.knowledge_bases ?? [],
      isExpanded: false,
      couldAddImageFile: false,
      extensions: [] as string[]
    }),
    [initialMentionedModels, initialAssistant.knowledge_bases]
  )

  return (
    <InputbarToolsProvider
      initialState={initialState}
      actions={{
        resizeTextArea: () => actionsRef.current.resizeTextArea(),
        addNewTopic: () => actionsRef.current.addNewTopic(),
        clearTopic: () => actionsRef.current.clearTopic(),
        onNewContext: () => actionsRef.current.onNewContext(),
        onTextChange: (updater) => actionsRef.current.onTextChange(updater),
        toggleExpanded: (next) => actionsRef.current.toggleExpanded(next)
      }}>
      <InputbarInner
        assistant={initialAssistant}
        setActiveTopic={setActiveTopic}
        topic={topic}
        actionsRef={actionsRef}
      />
    </InputbarToolsProvider>
  )
}

const InputbarInner: FC<InputbarInnerProps> = ({ assistant: initialAssistant, setActiveTopic, topic, actionsRef }) => {
  const scope = topic.type ?? TopicType.Chat
  const config = getInputbarConfig(scope)

  const { files, mentionedModels, selectedKnowledgeBases } = useInputbarToolsState()
  const { setFiles, setMentionedModels, setSelectedKnowledgeBases } = useInputbarToolsDispatch()
  const { setCouldAddImageFile } = useInputbarToolsInternalDispatch()

  const { text, setText } = useInputText({
    initialValue: CacheService.get<string>(INPUTBAR_DRAFT_CACHE_KEY) ?? '',
    onChange: (value) => CacheService.set(INPUTBAR_DRAFT_CACHE_KEY, value, DRAFT_CACHE_TTL)
  })
  const {
    textareaRef,
    resize: resizeTextArea,
    focus: focusTextarea,
    setExpanded,
    isExpanded: textareaIsExpanded,
    customHeight,
    setCustomHeight
  } = useTextareaResize({
    maxHeight: 500,
    minHeight: 30
  })

  const { assistant, addTopic, model, setModel, updateAssistant } = useAssistant(initialAssistant.id)
  const { sendMessageShortcut, showInputEstimatedTokens, enableQuickPanelTriggers } = useSettings()
  const [estimateTokenCount, setEstimateTokenCount] = useState(0)
  const [contextCount, setContextCount] = useState({ current: 0, max: 0 })

  const { t } = useTranslation()
  const { pauseMessages } = useMessageOperations(topic)
  const loading = useTopicLoading(topic)
  const dispatch = useAppDispatch()
  const isVisionAssistant = useMemo(() => isVisionModel(model), [model])
  const isGenerateImageAssistant = useMemo(() => isGenerateImageModel(model), [model])
  const { setTimeoutTimer } = useTimer()
  const isMultiSelectMode = useAppSelector((state) => state.runtime.chat.isMultiSelectMode)

  const isVisionSupported = useMemo(
    () =>
      (mentionedModels.length > 0 && isVisionModels(mentionedModels)) ||
      (mentionedModels.length === 0 && isVisionAssistant),
    [mentionedModels, isVisionAssistant]
  )

  const isGenerateImageSupported = useMemo(
    () =>
      (mentionedModels.length > 0 && isGenerateImageModels(mentionedModels)) ||
      (mentionedModels.length === 0 && isGenerateImageAssistant),
    [mentionedModels, isGenerateImageAssistant]
  )

  const canAddImageFile = useMemo(() => {
    return isVisionSupported || isGenerateImageSupported
  }, [isGenerateImageSupported, isVisionSupported])

  const canAddTextFile = useMemo(() => {
    return isVisionSupported || (!isVisionSupported && !isGenerateImageSupported)
  }, [isGenerateImageSupported, isVisionSupported])

  const supportedExts = useMemo(() => {
    if (canAddImageFile && canAddTextFile) {
      return [...imageExts, ...documentExts, ...textExts]
    }

    if (canAddImageFile) {
      return [...imageExts]
    }

    if (canAddTextFile) {
      return [...documentExts, ...textExts]
    }

    return []
  }, [canAddImageFile, canAddTextFile])

  useEffect(() => {
    setCouldAddImageFile(canAddImageFile)
  }, [canAddImageFile, setCouldAddImageFile])

  const onUnmount = useEffectEvent((id: string) => {
    CacheService.set(getMentionedModelsCacheKey(id), mentionedModels, DRAFT_CACHE_TTL)
  })

  useEffect(() => {
    return () => onUnmount(assistant.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistant.id])

  const placeholderText = enableQuickPanelTriggers
    ? t('chat.input.placeholder', { key: getSendMessageShortcutLabel(sendMessageShortcut) })
    : t('chat.input.placeholder_without_triggers', {
      key: getSendMessageShortcutLabel(sendMessageShortcut),
      defaultValue: t('chat.input.placeholder', {
        key: getSendMessageShortcutLabel(sendMessageShortcut)
      })
    })

  const sendMessage = useCallback(async () => {
    if (checkRateLimit(assistant)) {
      return
    }

    logger.info('Starting to send message')

    const parent = spanManagerService.startTrace(
      { topicId: topic.id, name: 'sendMessage', inputs: text },
      mentionedModels.length > 0 ? mentionedModels : [assistant.model]
    )
    EventEmitter.emit(EVENT_NAMES.SEND_MESSAGE, { topicId: topic.id, traceId: parent?.spanContext().traceId })

    try {
      const uploadedFiles = await FileManager.uploadFiles(files)

      const baseUserMessage: MessageInputBaseParams = { assistant, topic, content: text }
      if (uploadedFiles) {
        baseUserMessage.files = uploadedFiles
      }
      if (mentionedModels.length) {
        baseUserMessage.mentions = mentionedModels
      }

      baseUserMessage.usage = await estimateUserPromptUsage(baseUserMessage)

      const { message, blocks } = getUserMessage(baseUserMessage)
      message.traceId = parent?.spanContext().traceId

      dispatch(_sendMessage(message, blocks, assistant, topic.id))

      setText('')
      setFiles([])
      setTimeoutTimer('sendMessage_1', () => setText(''), 500)
      setTimeoutTimer('sendMessage_2', () => resizeTextArea(), 0)
      // Restore focus to textarea after sending to maintain IME state (fcitx5 issue)
      focusTextarea()
    } catch (error) {
      logger.warn('Failed to send message:', error as Error)
      parent?.recordException(error as Error)
    }
  }, [
    assistant,
    topic,
    text,
    mentionedModels,
    files,
    dispatch,
    setText,
    setFiles,
    setTimeoutTimer,
    resizeTextArea,
    focusTextarea
  ])

  const tokenCountProps = useMemo(() => {
    if (!config.showTokenCount || estimateTokenCount === undefined || !showInputEstimatedTokens) {
      return undefined
    }

    return {
      estimateTokenCount,
      inputTokenCount: estimateTokenCount,
      contextCount
    }
  }, [config.showTokenCount, contextCount, estimateTokenCount, showInputEstimatedTokens])

  const onPause = useCallback(async () => {
    await pauseMessages()
  }, [pauseMessages])

  const clearTopic = useCallback(async () => {
    if (loading) {
      await onPause()
      await delay(1)
    }

    EventEmitter.emit(EVENT_NAMES.CLEAR_MESSAGES, topic)
    focusTextarea()
  }, [focusTextarea, loading, onPause, topic])

  const onNewContext = useCallback(() => {
    if (loading) {
      onPause()
      return
    }
    EventEmitter.emit(EVENT_NAMES.NEW_CONTEXT)
  }, [loading, onPause])

  const addNewTopic = useCallback(async () => {
    const newTopic = getDefaultTopic(assistant.id)

    await db.topics.add({ id: newTopic.id, messages: [] })

    if (assistant.defaultModel) {
      setModel(assistant.defaultModel)
    }

    addTopic(newTopic)
    setActiveTopic(newTopic)

    setTimeoutTimer('addNewTopic', () => EventEmitter.emit(EVENT_NAMES.SHOW_TOPIC_SIDEBAR), 0)
  }, [addTopic, assistant.defaultModel, assistant.id, setActiveTopic, setModel, setTimeoutTimer])

  const handleRemoveModel = useCallback(
    (modelToRemove: Model) => {
      setMentionedModels(mentionedModels.filter((current) => current.id !== modelToRemove.id))
    },
    [mentionedModels, setMentionedModels]
  )

  const handleRemoveKnowledgeBase = useCallback(
    (knowledgeBase: KnowledgeBase) => {
      const nextKnowledgeBases = assistant.knowledge_bases?.filter((kb) => kb.id !== knowledgeBase.id)
      updateAssistant({ ...assistant, knowledge_bases: nextKnowledgeBases })
      setSelectedKnowledgeBases(nextKnowledgeBases ?? [])
    },
    [assistant, setSelectedKnowledgeBases, updateAssistant]
  )

  const handleToggleExpanded = useCallback(
    (nextState?: boolean) => {
      const target = typeof nextState === 'boolean' ? nextState : !textareaIsExpanded
      setExpanded(target)
      focusTextarea()
    },
    [focusTextarea, setExpanded, textareaIsExpanded]
  )

  useEffect(() => {
    actionsRef.current = {
      resizeTextArea,
      addNewTopic,
      clearTopic,
      onNewContext,
      onTextChange: setText,
      toggleExpanded: handleToggleExpanded
    }
  }, [resizeTextArea, addNewTopic, clearTopic, onNewContext, setText, handleToggleExpanded, actionsRef])

  useShortcut(
    'new_topic',
    () => {
      addNewTopic()
      EventEmitter.emit(EVENT_NAMES.SHOW_TOPIC_SIDEBAR)
      focusTextarea()
    },
    { preventDefault: true, enableOnFormTags: true }
  )

  useShortcut('clear_topic', clearTopic, {
    preventDefault: true,
    enableOnFormTags: true
  })

  useEffect(() => {
    const _setEstimateTokenCount = debounce(setEstimateTokenCount, 100, { leading: false, trailing: true })
    const unsubscribes = [
      EventEmitter.on(EVENT_NAMES.ESTIMATED_TOKEN_COUNT, ({ tokensCount, contextCount }) => {
        _setEstimateTokenCount(tokensCount)
        setContextCount({ current: contextCount.current, max: contextCount.max })
      }),
      ...[EventEmitter.on(EVENT_NAMES.ADD_NEW_TOPIC, addNewTopic)]
    ]

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    }
  }, [addNewTopic])

  useEffect(() => {
    const debouncedEstimate = debounce((value: string) => {
      if (showInputEstimatedTokens) {
        const count = estimateTxtTokens(value) || 0
        setEstimateTokenCount(count)
      }
    }, 500)

    debouncedEstimate(text)
    return () => debouncedEstimate.cancel()
  }, [showInputEstimatedTokens, text])

  useEffect(() => {
    if (!document.querySelector('.topview-fullscreen-container')) {
      focusTextarea()
    }
  }, [
    topic.id,
    assistant.mcpServers,
    assistant.knowledge_bases,
    assistant.enableWebSearch,
    assistant.webSearchProviderId,
    mentionedModels,
    focusTextarea
  ])

  // TODO: Just use assistant.knowledge_bases as selectedKnowledgeBases. context state is overdesigned.
  useEffect(() => {
    setSelectedKnowledgeBases(assistant.knowledge_bases ?? [])
  }, [assistant.knowledge_bases, setSelectedKnowledgeBases])

  useEffect(() => {
    // Disable web search if model doesn't support it
    if (!isWebSearchModel(model) && assistant.enableWebSearch) {
      updateAssistant({ ...assistant, enableWebSearch: false })
    }

    // Clear web search provider if disabled or model has mandatory search
    if (
      assistant.webSearchProviderId &&
      (!WebSearchService.isWebSearchEnabled(assistant.webSearchProviderId) || isMandatoryWebSearchModel(model))
    ) {
      updateAssistant({ ...assistant, webSearchProviderId: undefined })
    }

    // Auto-enable/disable image generation based on model capabilities
    if (isGenerateImageModel(model)) {
      if (isAutoEnableImageGenerationModel(model) && !assistant.enableGenerateImage) {
        updateAssistant({ ...assistant, enableGenerateImage: true })
      }
    } else if (assistant.enableGenerateImage) {
      updateAssistant({ ...assistant, enableGenerateImage: false })
    }
  }, [assistant, model, updateAssistant])

  if (isMultiSelectMode) {
    return null
  }

  // topContent: 所有顶部预览内容
  const topContent = (
    <>
      {selectedKnowledgeBases.length > 0 && (
        <KnowledgeBaseInput
          selectedKnowledgeBases={selectedKnowledgeBases}
          onRemoveKnowledgeBase={handleRemoveKnowledgeBase}
        />
      )}

      {mentionedModels.length > 0 && (
        <MentionModelsInput selectedModels={mentionedModels} onRemoveModel={handleRemoveModel} />
      )}
    </>
  )

  // leftToolbar: 左侧工具栏
  const leftToolbar = config.showTools ? <InputbarTools scope={scope} assistantId={assistant.id} /> : null

  // AIIRC: Gemini 风格的紧凑模型选择器
  const handleSelectModel = useCallback(async () => {
    const modelFilter = (m: Model) => !isEmbeddingModel(m) && !isRerankModel(m)
    const selectedModel = await SelectModelPopup.show({ model, filter: modelFilter })
    if (selectedModel) {
      const enabledWebSearch = isWebSearchModel(selectedModel)
      updateAssistant({
        ...assistant,
        model: selectedModel,
        enableWebSearch: enabledWebSearch && assistant.enableWebSearch
      })
    }
  }, [model, assistant, updateAssistant])

  // 获取简短模型名 (如 "GPT-4.1" 而非 "GPT-4.1 | AIIRC")
  const shortModelName = useMemo(() => {
    if (!model?.name) return '选择模型'
    // 取第一个空格或 | 之前的部分
    const name = model.name.split('|')[0].trim()
    return name.length > 12 ? name.substring(0, 12) + '…' : name
  }, [model])

  // rightToolbar: 右侧工具栏 - Gemini 风格模型选择器
  const rightToolbar = (
    <>
      <ModelSelectorChip onClick={handleSelectModel}>
        {shortModelName} <ChevronDown size={14} />
      </ModelSelectorChip>
    </>
  )

  return (
    <InputbarCore
      scope={scope}
      placeholder={placeholderText}
      text={text}
      onTextChange={setText}
      textareaRef={textareaRef}
      height={customHeight}
      onHeightChange={setCustomHeight}
      resizeTextArea={resizeTextArea}
      focusTextarea={focusTextarea}
      isLoading={loading}
      supportedExts={supportedExts}
      onPause={onPause}
      handleSendMessage={sendMessage}
      leftToolbar={leftToolbar}
      rightToolbar={rightToolbar}
      topContent={topContent}
    />
  )
}
const ModelSelectorChip = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.006em;
  color: var(--color-text-2);
  cursor: pointer;
  transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1),
              color 0.2s;
  white-space: nowrap;
  -webkit-app-region: no-drag;
  &:hover {
    background-color: var(--color-background-mute);
    color: var(--color-text);
  }
  &:active {
    transform: scale(0.96);
    transition-duration: 60ms;
  }
`

export default Inputbar
