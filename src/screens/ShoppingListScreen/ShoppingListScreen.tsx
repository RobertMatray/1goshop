import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, Pressable, Alert, Modal, FlatList, Platform } from 'react-native'
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
import { useListsMetaStore } from '../../stores/ListsMetaStore'
import { ShoppingListItem } from './components/ShoppingListItem'
import { AddItemInput } from './components/AddItemInput'
import { EmptyListPlaceholder } from './components/EmptyListPlaceholder'
import { TutorialOverlay } from './components/TutorialOverlay'
import type { ShoppingItem, ShoppingListMeta } from '../../types/shopping'
import { exportToClipboard, importFromClipboard, findExistingItemId } from '../../services/ListClipboardService'

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ShoppingListScreen'>

export function ShoppingListScreen(): React.ReactElement {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const insets = useSafeAreaInsets()
  const [showTutorial, setShowTutorial] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [showListPicker, setShowListPicker] = useState(false)
  const items = useShoppingListStore((s) => s.items)
  const startShopping = useActiveShoppingStore((s) => s.startShopping)
  const lists = useListsMetaStore((s) => s.lists)
  const selectedListId = useListsMetaStore((s) => s.selectedListId)
  const selectedList = useMemo(() => lists.find((l) => l.id === selectedListId), [lists, selectedListId])

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
      headerTitle: () => (
        <Pressable onPress={() => setShowListPicker(true)} style={styles.headerTitleButton}>
          <Text style={styles.headerTitleText} numberOfLines={1}>
            {selectedList?.name ?? t('ShoppingList.title')}
          </Text>
          <Ionicons name="chevron-down" size={16} color={styles.headerTitleText.color as string} />
        </Pressable>
      ),
      headerRight: () => (
        <View style={styles.headerRightRow}>
          {selectedListId && (
            <Pressable onPress={handleShareList} hitSlop={12} style={styles.headerButton}>
              <Ionicons name="share-outline" size={22} color={styles.startShoppingText.color as string} />
            </Pressable>
          )}
          <Pressable onPress={handleAddList} hitSlop={12} style={styles.headerButton}>
            <Ionicons name="add" size={26} color={styles.startShoppingText.color as string} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('SettingsScreen')} hitSlop={12} style={styles.headerButton}>
            <Ionicons name="settings-outline" size={24} color={styles.startShoppingText.color as string} />
          </Pressable>
        </View>
      ),
    })
  }, [navigation, selectedList?.name, t])

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
      <ListPickerModal
        visible={showListPicker}
        lists={lists}
        selectedListId={selectedListId}
        onSelect={handleSelectList}
        onRename={handleRenameList}
        onDelete={handleDeleteList}
        onAdd={handleAddList}
        onJoin={handleJoinList}
        onClose={() => setShowListPicker(false)}
        t={t}
      />
    </View>
  )

  function handleClearFilter(): void {
    setFilterText('')
  }

  function handleShareList(): void {
    if (selectedListId) {
      navigation.navigate('ShareListScreen', { listId: selectedListId })
    }
  }

  function handleJoinList(): void {
    setShowListPicker(false)
    navigation.navigate('JoinListScreen')
  }

  function handleStartShopping(): void {
    if (!selectedListId) return
    startShopping(items)
    navigation.navigate('ActiveShoppingScreen', { listId: selectedListId })
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

  async function handleSelectList(listId: string): Promise<void> {
    setShowListPicker(false)
    useListsMetaStore.getState().selectList(listId)
    await Promise.allSettled([
      useShoppingListStore.getState().switchToList(listId),
      useActiveShoppingStore.getState().switchToList(listId),
    ])
  }

  function handleAddList(): void {
    setShowListPicker(false)
    if (Platform.OS === 'web') {
      const name = window.prompt(t('Lists.newList'), '')
      if (name?.trim()) {
        const newId = useListsMetaStore.getState().createList(name)
        handleSelectList(newId)
      }
      return
    }
    Alert.prompt(
      t('Lists.newList'),
      undefined,
      [
        { text: t('ShoppingList.cancel'), style: 'cancel' },
        {
          text: t('ShoppingList.save'),
          onPress: (value: string | undefined) => {
            if (value?.trim()) {
              const newId = useListsMetaStore.getState().createList(value)
              handleSelectList(newId)
            }
          },
        },
      ],
      'plain-text',
      '',
      undefined,
    )
  }

  function handleRenameList(id: string, currentName: string): void {
    if (Platform.OS === 'web') {
      const name = window.prompt(t('Lists.renameList'), currentName)
      if (name?.trim()) {
        useListsMetaStore.getState().renameList(id, name)
      }
      return
    }
    Alert.prompt(
      t('Lists.renameList'),
      undefined,
      [
        { text: t('ShoppingList.cancel'), style: 'cancel' },
        {
          text: t('ShoppingList.save'),
          onPress: (value: string | undefined) => {
            if (value?.trim()) {
              useListsMetaStore.getState().renameList(id, value)
            }
          },
        },
      ],
      'plain-text',
      currentName,
      undefined,
    )
  }

  function handleDeleteList(id: string, name: string): void {
    const { lists: currentLists } = useListsMetaStore.getState()
    if (currentLists.length <= 1) {
      Alert.alert(t('Lists.deleteList'), t('Lists.lastList'))
      return
    }
    Alert.alert(
      t('Lists.deleteList'),
      t('Lists.deleteListConfirm', { name }),
      [
        { text: t('ShoppingList.cancel'), style: 'cancel' },
        {
          text: t('ShoppingList.delete'),
          style: 'destructive',
          onPress: async () => {
            const wasSelected = selectedListId === id
            await useListsMetaStore.getState().deleteList(id)
            if (wasSelected) {
              const { selectedListId: newId } = useListsMetaStore.getState()
              if (newId) {
                await handleSelectList(newId)
              }
            }
          },
        },
      ],
    )
  }
}

interface ListPickerModalProps {
  visible: boolean
  lists: ShoppingListMeta[]
  selectedListId: string | null
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string, name: string) => void
  onAdd: () => void
  onJoin: () => void
  onClose: () => void
  t: (key: string, options?: Record<string, unknown>) => string
}

function ListPickerModal({ visible, lists, selectedListId, onSelect, onRename, onDelete, onAdd, onJoin, onClose, t }: ListPickerModalProps): React.ReactElement {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={pickerStyles.overlay} onPress={onClose}>
        <Pressable style={pickerStyles.container} onPress={() => {}}>
          <Text style={pickerStyles.title}>{t('ShoppingList.title')}</Text>
          <FlatList
            data={lists}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={[pickerStyles.listItem, item.id === selectedListId && pickerStyles.listItemSelected]}
                onPress={() => onSelect(item.id)}
                onLongPress={() => onRename(item.id, item.name)}
              >
                <View style={pickerStyles.listItemContent}>
                  <Text style={[pickerStyles.listItemName, item.id === selectedListId && pickerStyles.listItemNameSelected]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.isShared && (
                    <Ionicons name="people-outline" size={14} color={pickerStyles.sharedIcon.color as string} />
                  )}
                </View>
                {lists.length > 1 && (
                  <Pressable onPress={() => onDelete(item.id, item.name)} hitSlop={8} style={pickerStyles.deleteButton}>
                    <Ionicons name="trash-outline" size={16} color={pickerStyles.deleteIcon.color as string} />
                  </Pressable>
                )}
              </Pressable>
            )}
            style={pickerStyles.list}
          />
          <Pressable style={pickerStyles.addButton} onPress={onAdd}>
            <Ionicons name="add-circle-outline" size={20} color={pickerStyles.addButtonText.color as string} />
            <Text style={pickerStyles.addButtonText}>{t('Lists.newList')}</Text>
          </Pressable>
          <Pressable style={pickerStyles.joinButton} onPress={onJoin}>
            <Ionicons name="people-outline" size={20} color={pickerStyles.joinButtonText.color as string} />
            <Text style={pickerStyles.joinButtonText}>{t('Sharing.joinSharedList')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
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
  headerTitleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerTitleText: {
    color: theme.colors.textOnTint,
    fontSize: theme.typography.fontSizeL,
    fontWeight: 'bold',
    maxWidth: 200,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButton: {
    padding: 4,
  },
}))

const pickerStyles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.sizes.radiusLg,
    padding: 16,
    width: '100%',
    maxWidth: 360,
    maxHeight: '70%',
  },
  title: {
    fontSize: theme.typography.fontSizeL,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  list: {
    flexGrow: 0,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: theme.sizes.radiusSm,
    marginBottom: 4,
  },
  listItemSelected: {
    backgroundColor: theme.colors.tint + '20',
  },
  listItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listItemName: {
    fontSize: theme.typography.fontSizeM,
    color: theme.colors.text,
    flexShrink: 1,
  },
  listItemNameSelected: {
    fontWeight: 'bold',
    color: theme.colors.tint,
  },
  sharedIcon: {
    color: theme.colors.tint,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  deleteIcon: {
    color: theme.colors.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
  },
  addButtonText: {
    fontSize: theme.typography.fontSizeM,
    color: theme.colors.tint,
    fontWeight: '600',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
  },
  joinButtonText: {
    fontSize: theme.typography.fontSizeM,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
}))
