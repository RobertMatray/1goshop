import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { I18nextProvider } from 'react-i18next'
import { SystemBars } from 'react-native-edge-to-edge'
import i18n, { initI18n } from './i18n/i18n'
import { AppNavigator } from './navigation/AppNavigator'
import { useShoppingListStore } from './stores/ShoppingListStore'
import { useActiveShoppingStore } from './stores/ActiveShoppingStore'
import { useThemeStore } from './stores/ThemeStore'
import { useAccentColorStore } from './stores/AccentColorStore'

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
      <GestureHandlerRootView style={appStyles.flex}>
        <I18nextProvider i18n={i18n}>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </I18nextProvider>
        <SystemBars style="auto" />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  )

  async function initialize(): Promise<void> {
    const results = await Promise.allSettled([
      initI18n(),
      useShoppingListStore.getState().load(),
      useActiveShoppingStore.getState().load(),
      useThemeStore.getState().load(),
      useAccentColorStore.getState().load(),
    ])
    const failures = results.filter((r) => r.status === 'rejected')
    if (failures.length > 0) {
      console.warn('[App] Initialization partially failed:', failures)
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
