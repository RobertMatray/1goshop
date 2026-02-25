import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { I18nextProvider } from 'react-i18next'
import { SystemBars } from 'react-native-edge-to-edge'
import i18n, { initI18n } from './i18n/i18n'
import { AppNavigator } from './navigation/AppNavigator'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useShoppingListStore } from './stores/ShoppingListStore'
import { useActiveShoppingStore } from './stores/ActiveShoppingStore'
import { useThemeStore } from './stores/ThemeStore'
import { useAccentColorStore } from './stores/AccentColorStore'
import { useListsMetaStore } from './stores/ListsMetaStore'
import { migrateToMultiList } from './services/MigrationService'

export function App(): React.ReactElement {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    initialize()
  }, [])

  if (!isReady) {
    return (
      <View style={appStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={appStyles.flex}>
          <I18nextProvider i18n={i18n}>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </I18nextProvider>
          <SystemBars style="auto" />
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  )

  async function initialize(): Promise<void> {
    // i18n must init first so migration can use translated default list name
    await initI18n().catch((e) => console.warn('[App] i18n init failed:', e))

    // Migration must run before stores load
    await migrateToMultiList()

    // Load lists meta first, then switch to selected list
    const results = await Promise.allSettled([
      useListsMetaStore.getState().load(),
      useShoppingListStore.getState().load(),
      useActiveShoppingStore.getState().load(),
      useThemeStore.getState().load(),
      useAccentColorStore.getState().load(),
    ])
    const failures = results.filter((r) => r.status === 'rejected')
    if (failures.length > 0) {
      console.warn('[App] Initialization partially failed:', failures)
    }

    // Switch stores to the selected list
    const { selectedListId } = useListsMetaStore.getState()
    if (selectedListId) {
      await Promise.allSettled([
        useShoppingListStore.getState().switchToList(selectedListId),
        useActiveShoppingStore.getState().switchToList(selectedListId),
      ])
    }

    setIsReady(true)
  }
}

const appStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
})
