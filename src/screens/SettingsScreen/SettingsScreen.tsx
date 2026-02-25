import React from 'react'
import { View, Text, Pressable, Alert, ScrollView } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../navigation/AppNavigator'
import { useThemeStore, type ThemeMode } from '../../stores/ThemeStore'
import { useAccentColorStore } from '../../stores/AccentColorStore'
import { useShoppingListStore } from '../../stores/ShoppingListStore'
import { useActiveShoppingStore } from '../../stores/ActiveShoppingStore'
import { useListsMetaStore } from '../../stores/ListsMetaStore'
import { createAndShareBackup, restoreFromFile } from '../../services/BackupService'
import { defaultLightColors } from '../../unistyles'
import type { SupportedLanguage } from '../../i18n/i18n'

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SettingsScreen'>

export function SettingsScreen(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const { themeMode, setTheme } = useThemeStore()
  const activeColor = useAccentColorStore((s) => s.activeColor)

  const currentLang = i18n.language as SupportedLanguage

  const themeOptions: { label: string; value: ThemeMode }[] = [
    { label: t('Settings.themeAuto'), value: 'auto' },
    { label: t('Settings.themeLight'), value: 'light' },
    { label: t('Settings.themeDark'), value: 'dark' },
  ]

  const languageOptions: { flag: string; label: string; value: SupportedLanguage }[] = [
    { flag: '\uD83C\uDDF8\uD83C\uDDF0', label: 'Slovensky', value: 'sk' },
    { flag: '\uD83C\uDDEC\uD83C\uDDE7', label: 'English', value: 'en' },
    { flag: '\uD83C\uDDE9\uD83C\uDDEA', label: 'Deutsch', value: 'de' },
    { flag: '\uD83C\uDDED\uD83C\uDDFA', label: 'Magyar', value: 'hu' },
    { flag: '\uD83C\uDDFA\uD83C\uDDE6', label: 'Ukrainska', value: 'uk' },
    { flag: '\uD83C\uDDE8\uD83C\uDDFF', label: 'Cesky', value: 'cs' },
    { flag: '\uD83C\uDDE8\uD83C\uDDF3', label: 'Zhongwen', value: 'zh' },
    { flag: '\uD83C\uDDEA\uD83C\uDDF8', label: 'Espa\u00f1ol', value: 'es' },
    { flag: '\uD83C\uDDEB\uD83C\uDDF7', label: 'Fran\u00e7ais', value: 'fr' },
    { flag: '\uD83C\uDDEE\uD83C\uDDF9', label: 'Italiano', value: 'it' },
    { flag: '\uD83C\uDDF5\uD83C\uDDF1', label: 'Polski', value: 'pl' },
    { flag: '\uD83C\uDDF5\uD83C\uDDF9', label: 'Portugu\u00eas', value: 'pt' },
  ]

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Settings.language')}</Text>
        <View style={styles.langGrid}>
          {languageOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.langButton, currentLang === option.value && styles.langButtonActive]}
              onPress={() => handleChangeLanguage(option.value)}
            >
              <Text style={styles.langFlag}>{option.flag}</Text>
              <Text
                style={[styles.langLabel, currentLang === option.value && styles.langLabelActive]}
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

      <Pressable style={styles.section} onPress={() => navigation.navigate('ColorPickerScreen')}>
        <View style={styles.historyRow}>
          <View style={styles.accentColorTitleRow}>
            <Text style={[styles.sectionTitle, styles.noMargin]}>{t('ColorPicker.title')}</Text>
            <View
              style={[
                styles.accentColorDot,
                { backgroundColor: activeColor ?? defaultLightColors.tint },
              ]}
            />
          </View>
          <Text style={styles.historyArrow}>{'\u203A'}</Text>
        </View>
      </Pressable>

      <Pressable style={styles.section} onPress={handleNavigateToHistory}>
        <View style={styles.historyRow}>
          <Text style={styles.sectionTitle}>{t('History.title')}</Text>
          <Text style={styles.historyArrow}>{'\u203A'}</Text>
        </View>
        <Text style={styles.hintText}>{t('History.description')}</Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Settings.about')}</Text>
        <Text style={styles.aboutText}>1GoShop v1.2.0</Text>
        <Text style={styles.hintText}>{t('ShoppingList.swipeRightHint')}</Text>
        <Text style={styles.hintText}>{t('ShoppingList.swipeLeftHint')}</Text>
        <Text style={styles.hintText}>{t('ShoppingList.longPressHint')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('Backup.title')}</Text>
        <Text style={styles.hintText}>{t('Backup.description')}</Text>
        <View style={styles.backupButtons}>
          <Pressable style={styles.backupButton} onPress={handleBackup}>
            <Text style={styles.backupButtonText}>{t('Backup.export')}</Text>
          </Pressable>
          <Pressable style={[styles.backupButton, styles.restoreButton]} onPress={handleRestore}>
            <Text style={styles.backupButtonText}>{t('Backup.import')}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )

  function handleNavigateToHistory(): void {
    const listId = useListsMetaStore.getState().selectedListId
    if (listId) {
      navigation.navigate('ShoppingHistoryScreen', { listId })
    }
  }

  function handleChangeLanguage(lang: SupportedLanguage): void {
    i18n.changeLanguage(lang)
  }

  async function handleBackup(): Promise<void> {
    try {
      await createAndShareBackup()
    } catch {
      Alert.alert(t('Backup.error'), t('Backup.exportError'))
    }
  }

  async function handleRestore(): Promise<void> {
    try {
      const success = await restoreFromFile()
      if (success) {
        await Promise.allSettled([
          useListsMetaStore.getState().load(),
          useShoppingListStore.getState().load(),
          useActiveShoppingStore.getState().load(),
          useThemeStore.getState().load(),
          useAccentColorStore.getState().load(),
        ])
        const { selectedListId } = useListsMetaStore.getState()
        if (selectedListId) {
          await Promise.allSettled([
            useShoppingListStore.getState().switchToList(selectedListId),
            useActiveShoppingStore.getState().switchToList(selectedListId),
          ])
        }
        Alert.alert(t('Backup.importDoneTitle'), t('Backup.importDoneMessage'))
      } else {
        Alert.alert(t('Backup.error'), t('Backup.importError'))
      }
    } catch {
      Alert.alert(t('Backup.error'), t('Backup.importError'))
    }
  }
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
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
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.sizes.radiusSm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    gap: 6,
  },
  langButtonActive: {
    backgroundColor: theme.colors.tint,
    borderColor: theme.colors.tint,
  },
  langFlag: {
    fontSize: 18,
  },
  langLabel: {
    fontSize: theme.typography.fontSizeS,
    color: theme.colors.text,
    fontWeight: '600',
  },
  langLabelActive: {
    color: theme.colors.textOnTint,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accentColorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noMargin: {
    marginBottom: 0,
  },
  accentColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  historyArrow: {
    fontSize: 24,
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
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
  backupButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  backupButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.sizes.radiusSm,
    backgroundColor: theme.colors.tint,
    alignItems: 'center',
  },
  restoreButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  backupButtonText: {
    fontSize: theme.typography.fontSizeS,
    color: theme.colors.text,
    fontWeight: '600',
  },
}))
