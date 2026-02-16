import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { ShoppingListScreen } from '../screens/ShoppingListScreen/ShoppingListScreen'
import { SettingsScreen } from '../screens/SettingsScreen/SettingsScreen'

export type RootStackParamList = {
  ShoppingListScreen: undefined
  SettingsScreen: undefined
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
    </Stack.Navigator>
  )
}
