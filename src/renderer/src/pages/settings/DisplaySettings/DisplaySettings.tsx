import { HStack } from '@renderer/components/Layout'
import { isMac, THEME_COLOR_PRESETS } from '@renderer/config/constant'
import { useTheme } from '@renderer/context/ThemeProvider'
import { useSettings } from '@renderer/hooks/useSettings'
import useUserTheme from '@renderer/hooks/useUserTheme'
import { ThemeMode } from '@renderer/types'
import { ColorPicker, Segmented } from 'antd'
import { Monitor, Moon, Sun } from 'lucide-react'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { SettingContainer, SettingDivider, SettingGroup, SettingRow, SettingRowTitle, SettingTitle } from '..'

const ColorCircleWrapper = styled.div`
  width: 24px;
  height: 24px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ColorCircle = styled.div<{ color: string; isActive?: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: ${(props) => props.color};
  cursor: pointer;
  transform: translate(-50%, -50%);
  border: 2px solid ${(props) => (props.isActive ? 'var(--color-border)' : 'transparent')};
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
`

const DisplaySettings: FC = () => {
  const { setTheme, userTheme } = useSettings()
  const { theme, settedTheme } = useTheme()
  const { t } = useTranslation()
  const { setUserTheme } = useUserTheme()

  const handleColorPrimaryChange = useCallback(
    (colorHex: string) => {
      setUserTheme({
        ...userTheme,
        colorPrimary: colorHex
      })
    },
    [setUserTheme, userTheme]
  )

  const themeOptions = useMemo(
    () => [
      {
        value: ThemeMode.light,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sun size={16} />
            <span>{t('settings.theme.light')}</span>
          </div>
        )
      },
      {
        value: ThemeMode.dark,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Moon size={16} />
            <span>{t('settings.theme.dark')}</span>
          </div>
        )
      },
      {
        value: ThemeMode.system,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Monitor size={16} />
            <span>{t('settings.theme.system')}</span>
          </div>
        )
      }
    ],
    [t]
  )

  return (
    <SettingContainer theme={theme}>
      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.display.title')}</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.theme.title')}</SettingRowTitle>
          <Segmented value={settedTheme} shape="round" onChange={setTheme} options={themeOptions} />
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.theme.color_primary')}</SettingRowTitle>
          <HStack gap="12px" alignItems="center">
            <HStack gap="12px">
              {THEME_COLOR_PRESETS.map((color) => (
                <ColorCircleWrapper key={color}>
                  <ColorCircle
                    color={color}
                    isActive={userTheme.colorPrimary === color}
                    onClick={() => handleColorPrimaryChange(color)}
                  />
                </ColorCircleWrapper>
              ))}
            </HStack>
            <ColorPicker
              style={{ fontFamily: 'inherit' }}
              className="color-picker"
              value={userTheme.colorPrimary}
              onChange={(color) => handleColorPrimaryChange(color.toHexString())}
              showText
              size="small"
              presets={[
                {
                  label: 'Presets',
                  colors: THEME_COLOR_PRESETS
                }
              ]}
            />
          </HStack>
        </SettingRow>
      </SettingGroup>
    </SettingContainer>
  )
}

export default DisplaySettings
