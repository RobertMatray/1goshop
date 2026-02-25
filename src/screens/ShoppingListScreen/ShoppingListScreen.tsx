import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, Pressable, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist'
import { StyleSheet } from 'react-native-unistyles'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../navigation/AppNavigator'
import { useShoppingListStore } from '../../stores/ShoppingListStore'
import { useActiveShoppingStore } from '../../stores/ActiveShoppingStore'
import { ShoppingListItem } from './components/ShoppingListItem'
import { AddItemInput } from './components/AddItemInput'
import { EmptyListPlaceholder } from './components/EmptyListPlaceholder'
import { TutorialOverlay } from './components/TutorialOverlay'
import type { ShoppingItem } from '../../types/shopping'
import { exportToClipboard, importFromClipboard, findExistingItemId } from '../../services/ListClipboardService'

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ShoppingListScreen'>

export function ShoppingListScreen(): React.ReactElement {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const insets = useSafeAreaInsets()
  const [showTutorial, setShowTutorial] = useState(false)
  const [filterText, setFilterText] = useState('')
  const items = useShoppingListStore((s) => s.items)
  const startShopping = useActiveShoppingStore((s) => s.startShopping)

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.order - b.order)
  }, [items])

  const trimmedFilter = useMemo(() => filterText.trim(), [filterText])
  const isFiltering = trimmedFilter.length > 0

  const filteredItems = useMemo(() => {
    if (!isFiltering) return sortedItems
    const needle = trimmedFilter.toLowerCase()
    return sortedItems.filter((item) => item.name.toLowerCase().includes(needle))
  }, [sortedItems, trimmedFilter, isFiltering])

  const checkedCount = useMemo(() => items.filter((i) => i.isChecked).length, [items])

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<ShoppingItem>) => (
      <ShoppingListItem item={item} drag={isFiltering ? undefined : drag} isActive={isActive} />
    ),
    [isFiltering],
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
        <Pressable onPress={() => navigation.navigate('SettingsScreen')} hitSlop={12} style={{ marginRight: 12, padding: 4 }}>
          <Ionicons name="settings-outline" size={24} color="#ffffff" />
        </Pressable>
      ),
    })
  }, [navigation])

  return (
    <View style={styles.container}>
      <AddItemInput filterText={filterText} onFilterTextChange={setFilterText} onClearFilter={handleClearFilter} />
      <View style={styles.listWrapper}>
        {filteredItems.length === 0 ? (
          isFiltering ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>{t('ShoppingList.noFilterResults')}</Text>
            </View>
          ) : (
            <EmptyListPlaceholder />
          )
        ) : (
          <DraggableFlatList
            data={filteredItems}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            onDragEnd={handleDragEnd}
            activationDistance={isFiltering ? 999999 : 0}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            autoscrollThreshold={80}
            autoscrollSpeed={200}
          />
        )}
      </View>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {items.length > 0 && (
          <Text style={styles.footerText}>
            {isFiltering
              ? t('ShoppingList.filteredCount', { filtered: filteredItems.length, total: items.length })
              : t('ShoppingList.itemCount', { count: items.length })}
            {checkedCount > 0 && ` · ${t('ShoppingList.markedForShopping', { count: checkedCount })}`}
          </Text>
        )}
        {checkedCount > 0 && (
          <Pressable style={styles.startShoppingButton} onPress={handleStartShopping}>
            <Text style={styles.startShoppingText}>{t('ActiveShopping.startShopping')}</Text>
          </Pressable>
        )}
        <View style={styles.clipboardRow}>
          <Pressable style={styles.clipboardButton} onPress={handleImport}>
            <Ionicons name="clipboard-outline" size={16} color={styles.clipboardButtonText.color} />
            <Text style={styles.clipboardButtonText}>{t('ClipboardList.import')}</Text>
          </Pressable>
          <Pressable
            style={[styles.clipboardButton, items.length === 0 && styles.clipboardButtonDisabled]}
            onPress={handleExport}
            disabled={items.length === 0}
          >
            <Ionicons name="copy-outline" size={16} color={styles.clipboardButtonText.color} />
            <Text style={styles.clipboardButtonText}>{t('ClipboardList.export')}</Text>
          </Pressable>
        </View>
        <Pressable style={styles.hintsRow} onPress={() => setShowTutorial(true)}>
          <Text style={styles.hintText}>{t('ShoppingList.swipeRightHint')}</Text>
          <Text style={styles.hintSeparator}>•</Text>
          <Text style={styles.hintText}>{t('ShoppingList.swipeLeftHint')}</Text>
          <Text style={styles.hintSeparator}>•</Text>
          <Text style={styles.hintText}>{t('ShoppingList.longPressHint')}</Text>
          <Text style={styles.hintSeparator}>•</Text>
          <Text style={styles.tutorialLink}>{t('Tutorial.showTutorial')}</Text>
        </Pressable>
      </View>
      <TutorialOverlay visible={showTutorial} onClose={() => setShowTutorial(false)} />
    </View>
  )

  function handleClearFilter(): void {
    setFilterText('')
  }

  function handleStartShopping(): void {
    startShopping(items)
    navigation.navigate('ActiveShoppingScreen')
  }

  function handleExport(): void {
    exportToClipboard(items).then((count) => {
      if (count === 0) {
        Alert.alert(t('ClipboardList.export'), t('ClipboardList.exportEmpty'))
      } else {
        Alert.alert(t('ClipboardList.export'), t('ClipboardList.exportSuccess', { count }))
      }
    })
  }

  function handleImport(): void {
    const { addItem, editItem } = useShoppingListStore.getState()
    importFromClipboard(items).then((result) => {
      if (result.empty) {
        Alert.alert(t('ClipboardList.import'), t('ClipboardList.importEmpty'))
        return
      }
      if (result.added.length === 0 && result.updated.length === 0) {
        Alert.alert(t('ClipboardList.import'), t('ClipboardList.importNoNew'))
        return
      }
      for (const name of result.added) {
        addItem(name)
      }
      for (const name of result.updated) {
        const existingId = findExistingItemId(name, items)
        if (existingId) {
          editItem(existingId, name)
        }
      }
      const parts: string[] = []
      if (result.added.length > 0) {
        parts.push(t('ClipboardList.importAdded', { count: result.added.length }))
      }
      if (result.updated.length > 0) {
        parts.push(t('ClipboardList.importUpdated', { count: result.updated.length }))
      }
      Alert.alert(t('ClipboardList.import'), parts.join(', '))
    })
  }

}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: theme.typography.fontSizeM,
    color: theme.colors.textSecondary,
  },
  footer: {
    paddingHorizontal: theme.sizes.screenPadding,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
  },
  footerText: {
    fontSize: theme.typography.fontSizeS,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  startShoppingButton: {
    backgroundColor: theme.colors.tint,
    borderRadius: theme.sizes.radiusSm,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  startShoppingText: {
    color: theme.colors.textOnTint,
    fontSize: theme.typography.fontSizeM,
    fontWeight: 'bold',
  },
  clipboardRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  clipboardButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: theme.sizes.radiusSm,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  clipboardButtonDisabled: {
    opacity: 0.3,
  },
  clipboardButtonText: {
    fontSize: theme.typography.fontSizeS,
    color: theme.colors.textSecondary,
  },
  hintsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  hintText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    opacity: 0.6,
  },
  hintSeparator: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    opacity: 0.4,
    marginHorizontal: 6,
  },
  tutorialLink: {
    fontSize: 11,
    color: theme.colors.tint,
    fontWeight: '600',
  },
}))
