import { getLocales } from 'expo-localization'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import sk from './locales/sk.json'
import en from './locales/en.json'

const supportedLanguages = ['sk', 'en'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return (supportedLanguages as readonly string[]).includes(lang)
}

export async function initI18n(): Promise<void> {
  const deviceLang = getLocales()[0]?.languageCode ?? 'en'
  const lang = isSupportedLanguage(deviceLang) ? deviceLang : 'en'

  await i18n.use(initReactI18next).init({
    lng: lang,
    fallbackLng: 'en',
    resources: {
      sk: { translation: sk },
      en: { translation: en },
    },
    interpolation: { escapeValue: false },
    debug: false,
  })
}

export default i18n
