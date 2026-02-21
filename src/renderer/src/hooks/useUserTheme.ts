import { useAppDispatch, useAppSelector } from '@renderer/store'
import type { UserTheme } from '@renderer/store/settings'
import { setUserTheme } from '@renderer/store/settings'
import Color from 'color'

export default function useUserTheme() {
  const userTheme = useAppSelector((state) => state.settings.userTheme)

  const dispatch = useAppDispatch()

  const initUserTheme = (theme: UserTheme = userTheme) => {
    let primaryColorStr = theme.colorPrimary
    if (primaryColorStr === '#00b96b') {
      primaryColorStr = '#6366F1' // Map legacy Cherry Studio green to AIIRC Indigo
    }
    const colorPrimary = Color(primaryColorStr)

    document.body.style.setProperty('--color-primary', colorPrimary.toString())
    document.body.style.setProperty('--primary', colorPrimary.toString())
    document.body.style.setProperty('--color-primary-soft', colorPrimary.alpha(0.6).toString())
    document.body.style.setProperty('--color-primary-mute', colorPrimary.alpha(0.3).toString())

    // Set font family CSS variables
    document.documentElement.style.setProperty('--user-font-family', `'${theme.userFontFamily}'`)
    document.documentElement.style.setProperty('--user-code-font-family', `'${theme.userCodeFontFamily}'`)
  }

  return {
    colorPrimary: Color(userTheme.colorPrimary),

    initUserTheme,

    setUserTheme(userTheme: UserTheme) {
      dispatch(setUserTheme(userTheme))

      initUserTheme(userTheme)
    }
  }
}
