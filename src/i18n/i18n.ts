import { getLocales } from 'expo-localization'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import sk from './locales/sk.json'
import en from './locales/en.json'
import de from './locales/de.json'
import hu from './locales/hu.json'
import uk from './locales/uk.json'
import cs from './locales/cs.json'
import zh from './locales/zh.json'

const supportedLanguages = ['sk', 'en', 'de', 'hu', 'uk', 'cs', 'zh'] as const
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
      de: { translation: de },
      hu: { translation: hu },
      uk: { translation: uk },
      cs: { translation: cs },
      zh: { translation: zh },
    },
    interpolation: { escapeValue: false },
    debug: false,
  })
}

export default i18n
