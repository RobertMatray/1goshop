import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { ShoppingListScreen } from '../screens/ShoppingListScreen/ShoppingListScreen'
import { SettingsScreen } from '../screens/SettingsScreen/SettingsScreen'
import { ActiveShoppingScreen } from '../screens/ActiveShoppingScreen/ActiveShoppingScreen'
import { ShoppingHistoryScreen } from '../screens/ShoppingHistoryScreen/ShoppingHistoryScreen'
import { ColorPickerScreen } from '../screens/ColorPickerScreen/ColorPickerScreen'
import { JoinListScreen } from '../screens/JoinListScreen/JoinListScreen'
import { DebugLogScreen } from '../screens/DebugLogScreen/DebugLogScreen'
import { ListManagementScreen } from '../screens/ListManagementScreen/ListManagementScreen'
import { StyleSheet } from 'react-native-unistyles'
import { useAccentColorStore } from '../stores/AccentColorStore'

export type RootStackParamList = {
  ShoppingListScreen: { listId: string } | undefined
  ListManagementScreen: undefined
  SettingsScreen: undefined
  ActiveShoppingScreen: { listId: string }
  ShoppingHistoryScreen: { listId: string }
  ColorPickerScreen: undefined
  JoinListScreen: undefined
  DebugLogScreen: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export function AppNavigator(): React.ReactElement {
  const { t } = useTranslation()
  const activeColor = useAccentColorStore((s) => s.activeColor)
  const headerColor = activeColor ?? (navStyles.headerFallback.backgroundColor as string)

  return (
    <Stack.Navigator
      initialRouteName="ShoppingListScreen"
      screenOptions={{
        headerStyle: { backgroundColor: headerColor },
        headerTintColor: navStyles.headerTint.color as string,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="ShoppingListScreen"
        component={ShoppingListScreen}
        options={{
          title: t('ShoppingList.title'),
        }}
      />
      <Stack.Screen
        name="ListManagementScreen"
        component={ListManagementScreen}
        options={{
          title: t('Lists.manageTitle'),
        }}
      />
      <Stack.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={{
          title: t('Settings.title'),
        }}
      />
      <Stack.Screen
        name="ActiveShoppingScreen"
        component={ActiveShoppingScreen}
        options={{
          title: t('ActiveShopping.title'),
        }}
      />
      <Stack.Screen
        name="ShoppingHistoryScreen"
        component={ShoppingHistoryScreen}
        options={{
          title: t('History.title'),
        }}
      />
      <Stack.Screen
        name="ColorPickerScreen"
        component={ColorPickerScreen}
        options={{
          title: t('ColorPicker.title'),
        }}
      />
      <Stack.Screen
        name="JoinListScreen"
        component={JoinListScreen}
        options={{
          title: t('Sharing.joinTitle'),
        }}
      />
      <Stack.Screen
        name="DebugLogScreen"
        component={DebugLogScreen}
        options={{
          title: 'Debug Logs',
        }}
      />
    </Stack.Navigator>
  )
}

const navStyles = StyleSheet.create((theme) => ({
  headerFallback: {
    backgroundColor: theme.colors.tint,
  },
  headerTint: {
    color: theme.colors.textOnTint,
  },
}))
