import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { useTranslation } from 'react-i18next'
import { useThemeStore, type ThemeMode } from '../../stores/ThemeStore'
import type { SupportedLanguage } from '../../i18n/i18n'

export function SettingsScreen(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const { themeMode, setTheme } = useThemeStore()

  const currentLang = i18n.language as SupportedLanguage

  const themeOptions: { label: string; value: ThemeMode }[] = [
    { label: t('Settings.themeAuto'), value: 'auto' },
    { label: t('Settings.themeLight'), value: 'light' },
    { label: t('Settings.themeDark'), value: 'dark' },
  ]

  const languageOptions: { label: string; value: SupportedLanguage }[] = [
    { label: 'Slovencina', value: 'sk' },
    { label: 'English', value: 'en' },
  ]

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Settings.language')}</Text>
        <View style={styles.optionsRow}>
          {languageOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.optionButton, currentLang === option.value && styles.optionButtonActive]}
              onPress={() => handleChangeLanguage(option.value)}
            >
              <Text
                style={[styles.optionText, currentLang === option.value && styles.optionTextActive]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Settings.theme')}</Text>
        <View style={styles.optionsRow}>
          {themeOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.optionButton, themeMode === option.value && styles.optionButtonActive]}
              onPress={() => setTheme(option.value)}
            >
              <Text
                style={[styles.optionText, themeMode === option.value && styles.optionTextActive]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Settings.about')}</Text>
        <Text style={styles.aboutText}>1GoShop v1.0.0</Text>
        <Text style={styles.hintText}>{t('ShoppingList.swipeRightHint')}</Text>
        <Text style={styles.hintText}>{t('ShoppingList.swipeLeftHint')}</Text>
        <Text style={styles.hintText}>{t('ShoppingList.longPressHint')}</Text>
      </View>
    </View>
  )

  function handleChangeLanguage(lang: SupportedLanguage): void {
    i18n.changeLanguage(lang)
  }
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.sizes.screenPadding,
    gap: 24,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.sizes.radiusLg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSizeL,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.sizes.radiusSm,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  optionButtonActive: {
    backgroundColor: theme.colors.tint,
    borderColor: theme.colors.tint,
  },
  optionText: {
    fontSize: theme.typography.fontSizeS,
    color: theme.colors.text,
    fontWeight: '600',
  },
  optionTextActive: {
    color: theme.colors.textOnTint,
  },
  aboutText: {
    fontSize: theme.typography.fontSizeM,
    color: theme.colors.text,
    marginBottom: 8,
  },
  hintText: {
    fontSize: theme.typography.fontSizeS,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
}))
