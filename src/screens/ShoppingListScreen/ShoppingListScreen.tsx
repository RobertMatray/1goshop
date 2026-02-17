import React, { useMemo, useCallback } from 'react'
import { View, Text, Pressable } from 'react-native'
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist'
import { StyleSheet } from 'react-native-unistyles'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../navigation/AppNavigator'
import { useShoppingListStore } from '../../stores/ShoppingListStore'
import { ShoppingListItem } from './components/ShoppingListItem'
import { AddItemInput } from './components/AddItemInput'
import { EmptyListPlaceholder } from './components/EmptyListPlaceholder'
import type { ShoppingItem } from '../../types/shopping'

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ShoppingListScreen'>

export function ShoppingListScreen(): React.ReactElement {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const items = useShoppingListStore((s) => s.items)
  const clearChecked = useShoppingListStore((s) => s.clearChecked)

  const sortedItems = useMemo(() => {
    const unchecked = items.filter((i) => !i.isChecked).sort((a, b) => a.order - b.order)
    const checked = items.filter((i) => i.isChecked).sort((a, b) => a.order - b.order)
    return [...unchecked, ...checked]
  }, [items])

  const checkedCount = useMemo(() => items.filter((i) => i.isChecked).length, [items])

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<ShoppingItem>) => (
      <ShoppingListItem item={item} drag={drag} isActive={isActive} />
    ),
    [],
  )

  const keyExtractor = useCallback((item: ShoppingItem) => item.id, [])

  const setItems = useShoppingListStore((s) => s.setItems)

  const handleDragEnd = useCallback(({ data }: { data: ShoppingItem[] }) => {
    const reordered = data.map((item, index) => ({ ...item, order: index }))
    setItems(reordered)
  }, [setItems])

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('SettingsScreen')} hitSlop={8}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </Pressable>
      ),
    })
  }, [navigation])

  return (
    <View style={styles.container}>
      <AddItemInput />
      {sortedItems.length === 0 ? (
        <EmptyListPlaceholder />
      ) : (
        <DraggableFlatList
          data={sortedItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
      {items.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('ShoppingList.itemCount', { count: items.length })}
            {checkedCount > 0 && ` · ${t('ShoppingList.checkedCount', { count: checkedCount })}`}
          </Text>
          {checkedCount > 0 && (
            <Pressable onPress={clearChecked} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>{t('ShoppingList.clearChecked')}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    paddingBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.sizes.screenPadding,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
  },
  footerText: {
    fontSize: theme.typography.fontSizeS,
    color: theme.colors.textSecondary,
  },
  clearButton: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.sizes.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: theme.typography.fontSizeS,
    fontWeight: 'bold',
  },
  settingsIcon: {
    fontSize: 22,
  },
}))
