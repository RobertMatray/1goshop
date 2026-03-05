import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, Pressable, Alert, Modal, Platform, TextInput as TextInputField } from 'react-native'
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
import type { ShoppingItem } from '../../types/shopping'
import { exportToClipboard, importFromClipboard, findExistingItemId } from '../../services/ListClipboardService'

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ShoppingListScreen'>

export function ShoppingListScreen(): React.ReactElement {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const insets = useSafeAreaInsets()
  const [showTutorial, setShowTutorial] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [textInputModal, setTextInputModal] = useState<{ title: string; defaultValue: string; onConfirm: (value: string) => void } | null>(null)
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

  const handleRequestEdit = useCallback((item: ShoppingItem): void => {
    setTextInputModal({
      title: t('ShoppingList.editTitle'),
      defaultValue: item.name,
      onConfirm: (value) => {
        if (value.trim()) {
          useShoppingListStore.getState().editItem(item.id, value.trim())
        }
      },
    })
  }, [t])

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<ShoppingItem>) => (
      <ShoppingListItem item={item} drag={isFiltering ? undefined : drag} isActive={isActive} onRequestEdit={handleRequestEdit} />
    ),
    [isFiltering, handleRequestEdit],
  )

  const keyExtractor = useCallback((item: ShoppingItem) => item.id, [])

  const setItems = useShoppingListStore((s) => s.setItems)

  const handleDragEnd = useCallback(({ data }: { data: ShoppingItem[] }) => {
    if (isFiltering) return
    // Safety guard: only reorder if we have all items — prevents filtered drag from overwriting hidden items
    const currentItems = useShoppingListStore.getState().items
    if (data.length !== currentItems.length) return
    const reordered = data.map((item, index) => ({ ...item, order: index }))
    setItems(reordered)
  }, [setItems, isFiltering])

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable onPress={() => navigation.navigate('ListManagementScreen')} style={styles.headerTitleButton}>
          <Text style={styles.headerTitleText} numberOfLines={1}>
            {selectedList?.name ?? t('ShoppingList.title')}
          </Text>
          <Ionicons name="chevron-down" size={16} color={styles.headerTitleText.color as string} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('SettingsScreen')}
          onLongPress={() => navigation.navigate('DebugLogScreen')}
          hitSlop={12}
          style={styles.headerButton}
        >
          <Ionicons name="settings-outline" size={24} color={styles.startShoppingText.color as string} />
        </Pressable>
      ),
    })
  }, [navigation, selectedList?.name, selectedListId, t])

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
      {textInputModal !== null && (
        <TextInputModal
          title={textInputModal.title}
          defaultValue={textInputModal.defaultValue}
          onConfirm={(value) => {
            const confirm = textInputModal.onConfirm
            setTextInputModal(null)
            confirm(value)
          }}
          onCancel={() => setTextInputModal(null)}
          t={t}
        />
      )}
    </View>
  )

  function handleClearFilter(): void {
    setFilterText('')
  }

  function handleStartShopping(): void {
    if (!selectedListId) return
    startShopping(items)
    navigation.navigate('ActiveShoppingScreen', { listId: selectedListId })
  }

  function handleExport(): void {
    exportToClipboard(items)
      .then((count) => {
        if (count === 0) {
          Alert.alert(t('ClipboardList.export'), t('ClipboardList.exportEmpty'))
        } else {
          Alert.alert(t('ClipboardList.export'), t('ClipboardList.exportSuccess', { count }))
        }
      })
      .catch((error) => {
        console.warn('[ShoppingListScreen] Export failed:', error)
        Alert.alert(t('ClipboardList.export'), t('ClipboardList.exportEmpty'))
      })
  }

  function handleImport(): void {
    const { addItem, editItem } = useShoppingListStore.getState()
    importFromClipboard(items)
      .then((result) => {
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
      .catch((error) => {
        console.warn('[ShoppingListScreen] Import failed:', error)
        Alert.alert(t('ClipboardList.import'), t('ClipboardList.importEmpty'))
      })
  }
}

interface TextInputModalProps {
  title: string
  defaultValue: string
  onConfirm: (value: string) => void
  onCancel: () => void
  t: (key: string) => string
}

function TextInputModal({ title, defaultValue, onConfirm, onCancel, t }: TextInputModalProps): React.ReactElement {
  const [value, setValue] = useState(defaultValue)
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={pickerStyles.overlay} onPress={onCancel}>
        <Pressable style={pickerStyles.container} onPress={() => {}}>
          <Text style={pickerStyles.title}>{title}</Text>
          <TextInputField
            value={value}
            onChangeText={setValue}
            autoFocus
            maxLength={100}
            style={textInputModalStyles.input}
            onSubmitEditing={() => onConfirm(value)}
            returnKeyType="done"
          />
          <View style={textInputModalStyles.buttons}>
            <Pressable style={textInputModalStyles.cancelButton} onPress={onCancel}>
              <Text style={textInputModalStyles.cancelText}>{t('ShoppingList.cancel')}</Text>
            </Pressable>
            <Pressable style={textInputModalStyles.confirmButton} onPress={() => onConfirm(value)}>
              <Text style={textInputModalStyles.confirmText}>{t('ShoppingList.save')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const textInputModalStyles = StyleSheet.create((theme) => ({
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.sizes.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: theme.typography.fontSizeM,
    color: theme.colors.text,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: theme.sizes.radiusSm,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  cancelText: {
    fontSize: theme.typography.fontSizeM,
    color: theme.colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: theme.sizes.radiusSm,
    backgroundColor: theme.colors.tint,
  },
  confirmText: {
    fontSize: theme.typography.fontSizeM,
    fontWeight: 'bold',
    color: theme.colors.textOnTint,
  },
}))

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
  },
  title: {
    fontSize: theme.typography.fontSizeL,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
}))
