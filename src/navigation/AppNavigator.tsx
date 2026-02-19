import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { ShoppingListScreen } from '../screens/ShoppingListScreen/ShoppingListScreen'
import { SettingsScreen } from '../screens/SettingsScreen/SettingsScreen'
import { ActiveShoppingScreen } from '../screens/ActiveShoppingScreen/ActiveShoppingScreen'
import { ShoppingHistoryScreen } from '../screens/ShoppingHistoryScreen/ShoppingHistoryScreen'
import { ColorPickerScreen } from '../screens/ColorPickerScreen/ColorPickerScreen'
import { useAccentColorStore } from '../stores/AccentColorStore'
import { defaultLightColors } from '../unistyles'

export type RootStackParamList = {
  ShoppingListScreen: undefined
  SettingsScreen: undefined
  ActiveShoppingScreen: undefined
  ShoppingHistoryScreen: undefined
  ColorPickerScreen: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export function AppNavigator(): React.ReactElement {
  const { t } = useTranslation()
  const activeColor = useAccentColorStore((s) => s.activeColor)
  const headerColor = activeColor ?? defaultLightColors.tint

  return (
    <Stack.Navigator
      initialRouteName="ShoppingListScreen"
      screenOptions={{
        headerStyle: { backgroundColor: headerColor },
        headerTintColor: '#ffffff',
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
    </Stack.Navigator>
  )
}
