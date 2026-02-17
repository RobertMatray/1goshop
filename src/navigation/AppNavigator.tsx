import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { ShoppingListScreen } from '../screens/ShoppingListScreen/ShoppingListScreen'
import { SettingsScreen } from '../screens/SettingsScreen/SettingsScreen'
import { ActiveShoppingScreen } from '../screens/ActiveShoppingScreen/ActiveShoppingScreen'
import { ShoppingHistoryScreen } from '../screens/ShoppingHistoryScreen/ShoppingHistoryScreen'

export type RootStackParamList = {
  ShoppingListScreen: undefined
  SettingsScreen: undefined
  ActiveShoppingScreen: undefined
  ShoppingHistoryScreen: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export function AppNavigator(): React.ReactElement {
  const { t } = useTranslation()

  return (
    <Stack.Navigator
      initialRouteName="ShoppingListScreen"
      screenOptions={{
        headerStyle: { backgroundColor: '#4CAF50' },
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
    </Stack.Navigator>
  )
}
