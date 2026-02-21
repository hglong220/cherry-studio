// AIIRC: 合并视图 - 所有服务商卡片在一个页面，每个带内联 API Key 输入
import { loggerService } from '@logger'
import { ProviderAvatar } from '@renderer/components/ProviderAvatar'
import Scrollbar from '@renderer/components/Scrollbar'
import { useAllProviders, useProviders } from '@renderer/hooks/useProvider'
import ImageStorage from '@renderer/services/ImageStorage'
import type { Provider } from '@renderer/types'
import { isSystemProvider } from '@renderer/types'
import { getFancyProviderName, uuid } from '@renderer/utils'
import { Button, Input, Switch } from 'antd'
import { PlusIcon } from 'lucide-react'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import AddProviderPopup from './AddProviderPopup'

const logger = loggerService.withContext('ProviderList')

const ProviderList: FC = () => {
  const providers = useAllProviders()
  const { updateProviders, addProvider, updateProvider } = useProviders()
  const { t } = useTranslation()
  const [providerLogos, setProviderLogos] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadAllLogos = async () => {
      const logos: Record<string, string> = {}
      for (const provider of providers) {
        if (provider.id) {
          try {
            const logoData = await ImageStorage.get(`provider-${provider.id}`)
            if (logoData) {
              logos[provider.id] = logoData
            }
          } catch (error) {
            logger.error(`Failed to load logo for provider ${provider.id}`, error as Error)
          }
        }
      }
      setProviderLogos(logos)
    }
    loadAllLogos()
  }, [providers])

  // AIIRC: 只显示已启用的 + 顶级的 + 自定义的
  const topProviders = ['openai', 'anthropic', 'gemini', 'deepseek']
  const filteredProviders = providers.filter((provider) => {
    if (!provider.enabled && isSystemProvider(provider) && !topProviders.includes(provider.id)) {
      return false
    }
    return true
  })

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
      try {
        await ImageStorage.set(`provider-${provider.id}`, logo)
        setProviderLogos((prev) => ({ ...prev, [provider.id]: logo }))
      } catch (error) {
        logger.error('Failed to save logo', error as Error)
      }
    }

    addProvider(provider)
  }

  const onToggleProvider = (provider: Provider, enabled: boolean) => {
    updateProvider({ ...provider, enabled })
    if (enabled) {
      const reordered = [...providers]
      const idx = reordered.findIndex((p) => p.id === provider.id)
      if (idx > 0) {
        const [item] = reordered.splice(idx, 1)
        reordered.unshift({ ...item, enabled: true })
        updateProviders(reordered)
      }
    }
  }

  const onUpdateApiKey = (provider: Provider, apiKey: string) => {
    updateProvider({ ...provider, apiKey })
  }

  return (
    <MergedContainer className="selectable">
      <Scrollbar style={{ flex: 1, padding: '16px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {filteredProviders.map((provider) => (
            <ProviderRow key={provider.id}>
              <ProviderAvatar
                style={{ width: 28, height: 28, flexShrink: 0 }}
                provider={provider}
                customLogos={providerLogos}
              />
              <ProviderName>{getFancyProviderName(provider)}</ProviderName>
              <ApiKeyInput
                size="small"
                value={provider.apiKey}
                placeholder="API Key"
                onChange={(e) => onUpdateApiKey(provider, e.target.value)}
              />
              <Switch
                size="small"
                checked={provider.enabled}
                onChange={(enabled) => onToggleProvider(provider, enabled)}
              />
            </ProviderRow>
          ))}
          <Button
            style={{ width: '100%', borderRadius: 10, marginTop: 8, height: 36 }}
            icon={<PlusIcon size={14} />}
            onClick={onAddProvider}>
            自定义
          </Button>
        </div>
      </Scrollbar>
    </MergedContainer>
  )
}

const MergedContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`

const ProviderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 10px;
  border-radius: 10px;
  transition: background-color 0.2s cubic-bezier(0.2, 0, 0, 1);
  &:hover {
    background: var(--bg-hover);
  }
  & + & {
    border-top: 0.5px solid var(--color-border-soft);
  }
`

const ProviderName = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-1);
  white-space: nowrap;
  min-width: 90px;
  flex-shrink: 0;
`

const ApiKeyInput = styled(Input.Password)`
  flex: 1;
  min-width: 0;
  &.ant-input-password, &.ant-input-affix-wrapper {
    height: 30px;
    border-radius: 8px;
    font-size: 12px;
  }
`

export default ProviderList
