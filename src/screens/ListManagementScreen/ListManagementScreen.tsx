import React, { useState, useCallback } from 'react'
import { View, Text, Pressable, Alert, FlatList, Platform, TextInput as TextInputField } from 'react-native'
import { Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StyleSheet } from 'react-native-unistyles'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../navigation/AppNavigator'
import { useListsMetaStore } from '../../stores/ListsMetaStore'
import { useShoppingListStore } from '../../stores/ShoppingListStore'
import { useActiveShoppingStore } from '../../stores/ActiveShoppingStore'
import type { ShoppingListMeta } from '../../types/shopping'
import {
  firebaseLeaveList,
  unsubscribeFromList,
} from '../../services/FirebaseSyncService'

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ListManagementScreen'>

export function ListManagementScreen(): React.ReactElement {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const insets = useSafeAreaInsets()
  const lists = useListsMetaStore((s) => s.lists)
  const selectedListId = useListsMetaStore((s) => s.selectedListId)
  const [textInputModal, setTextInputModal] = useState<{
    title: string
    defaultValue: string
    onConfirm: (value: string) => void
  } | null>(null)

  const keyExtractor = useCallback((item: ShoppingListMeta) => item.id, [])

  const renderItem = useCallback(
    ({ item }: { item: ShoppingListMeta }) => {
      const isSelected = item.id === selectedListId
      return (
        <Pressable
          style={[styles.listItem, isSelected && styles.listItemSelected]}
          onPress={() => handleSelectList(item.id)}
          onLongPress={() => openRenameModal(item)}
        >
          <View style={styles.listItemContent}>
            {isSelected ? (
              <Ionicons name="checkmark-circle" size={18} color={styles.selectedIcon.color as string} />
            ) : (
              <Ionicons name="ellipse-outline" size={18} color={styles.unselectedIcon.color as string} />
            )}
            <Text
              style={[styles.listItemName, isSelected && styles.listItemNameSelected]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.isShared && (
              <Ionicons name="people" size={16} color={styles.sharedIcon.color as string} />
            )}
          </View>
          <Pressable
            onPress={() => openContextMenu(item)}
            hitSlop={12}
            style={styles.moreButton}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={styles.moreIcon.color as string} />
          </Pressable>
        </Pressable>
      )
    },
    [selectedListId, t],
  )

  return (
    <View style={styles.container}>
      <FlatList
        data={lists}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom + 120, 140) }]}
        showsVerticalScrollIndicator={false}
      />
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable style={styles.joinButton} onPress={handleJoin}>
          <Ionicons name="people-outline" size={20} color={styles.joinButtonText.color as string} />
          <Text style={styles.joinButtonText}>{t('Sharing.joinSharedList')}</Text>
        </Pressable>
        <Pressable style={styles.addButton} onPress={handleAddList}>
          <Ionicons name="add-circle-outline" size={20} color={styles.addButtonText.color as string} />
          <Text style={styles.addButtonText}>{t('Lists.newList')}</Text>
        </Pressable>
      </View>
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

  async function handleSelectList(listId: string): Promise<void> {
    useListsMetaStore.getState().selectList(listId)
    await Promise.allSettled([
      useShoppingListStore.getState().switchToList(listId),
      useActiveShoppingStore.getState().switchToList(listId),
    ])
    navigation.goBack()
  }

  function handleJoin(): void {
    navigation.navigate('JoinListScreen')
  }

  function handleAddList(): void {
    if (Platform.OS === 'web') {
      const name = window.prompt(t('Lists.newList'), '')
      if (name?.trim()) {
        const newId = useListsMetaStore.getState().createList(name.trim())
        handleSelectList(newId)
      }
      return
    }
    setTextInputModal({
      title: t('Lists.newList'),
      defaultValue: '',
      onConfirm: (value) => {
        if (value.trim()) {
          const newId = useListsMetaStore.getState().createList(value.trim())
          handleSelectList(newId)
        }
      },
    })
  }

  function openRenameModal(list: ShoppingListMeta): void {
    if (Platform.OS === 'web') {
      const name = window.prompt(t('Lists.renameList'), list.name)
      if (name?.trim()) {
        useListsMetaStore.getState().renameList(list.id, name.trim())
      }
      return
    }
    setTextInputModal({
      title: t('Lists.renameList'),
      defaultValue: list.name,
      onConfirm: (value) => {
        if (value.trim()) {
          useListsMetaStore.getState().renameList(list.id, value.trim())
        }
      },
    })
  }

  function openContextMenu(list: ShoppingListMeta): void {
    const buttons: Parameters<typeof Alert.alert>[2] = []

    buttons.push({
      text: t('Lists.renameList'),
      onPress: () => openRenameModal(list),
    })

    if (list.isShared) {
      buttons.push({
        text: t('Sharing.manageSharing'),
        onPress: () => navigation.navigate('ShareListScreen', { listId: list.id }),
      })
      buttons.push({
        text: t('Sharing.stopSharing'),
        style: 'destructive',
        onPress: () => confirmUnlink(list),
      })
    } else {
      buttons.push({
        text: t('Sharing.shareButton'),
        onPress: () => navigation.navigate('ShareListScreen', { listId: list.id }),
      })
    }

    if (lists.length > 1) {
      buttons.push({
        text: t('Lists.deleteList'),
        style: 'destructive',
        onPress: () => confirmDelete(list),
      })
    }

    buttons.push({
      text: t('ShoppingList.cancel'),
      style: 'cancel',
    })

    Alert.alert(list.name, undefined, buttons)
  }

  function confirmDelete(list: ShoppingListMeta): void {
    Alert.alert(
      t('Lists.deleteList'),
      t('Lists.deleteListConfirm', { name: list.name }),
      [
        { text: t('ShoppingList.cancel'), style: 'cancel' },
        {
          text: t('ShoppingList.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const wasSelected = selectedListId === list.id
              await useListsMetaStore.getState().deleteList(list.id)
              if (wasSelected) {
                const { selectedListId: newId } = useListsMetaStore.getState()
                if (newId) {
                  useListsMetaStore.getState().selectList(newId)
                  await Promise.allSettled([
                    useShoppingListStore.getState().switchToList(newId),
                    useActiveShoppingStore.getState().switchToList(newId),
                  ])
                }
              }
            } catch (error) {
              console.warn('[ListManagementScreen] Delete list failed:', error)
            }
          },
        },
      ],
    )
  }

  function confirmUnlink(list: ShoppingListMeta): void {
    Alert.alert(t('Sharing.unlinkTitle'), t('Sharing.unlinkConfirm'), [
      { text: t('ShoppingList.cancel'), style: 'cancel' },
      {
        text: t('Sharing.stopSharing'),
        style: 'destructive',
        onPress: async () => {
          if (list.firebaseListId) {
            unsubscribeFromList(list.firebaseListId)
            await firebaseLeaveList(list.firebaseListId).catch(() => {})
          }
          useListsMetaStore.getState().unlinkList(list.id)
          const { selectedListId: currentId } = useListsMetaStore.getState()
          if (currentId === list.id) {
            await useShoppingListStore.getState().switchToList(list.id)
          }
        },
      },
    ])
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
      <Pressable style={modalStyles.overlay} onPress={onCancel}>
        <Pressable style={modalStyles.container} onPress={() => {}}>
          <Text style={modalStyles.title}>{title}</Text>
          <TextInputField
            value={value}
            onChangeText={setValue}
            autoFocus
            maxLength={100}
            style={modalStyles.input}
            onSubmitEditing={() => onConfirm(value)}
            returnKeyType="done"
          />
          <View style={modalStyles.buttons}>
            <Pressable style={modalStyles.cancelButton} onPress={onCancel}>
              <Text style={modalStyles.cancelText}>{t('ShoppingList.cancel')}</Text>
            </Pressable>
            <Pressable style={modalStyles.confirmButton} onPress={() => onConfirm(value)}>
              <Text style={modalStyles.confirmText}>{t('ShoppingList.save')}</Text>
            </Pressable>
          </View>
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
  listContent: {
    padding: theme.sizes.screenPadding,
    gap: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: theme.sizes.radiusSm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  listItemSelected: {
    borderColor: theme.colors.tint,
    backgroundColor: theme.colors.tint + '12',
  },
  listItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listItemName: {
    flex: 1,
    fontSize: theme.typography.fontSizeM,
    color: theme.colors.text,
  },
  listItemNameSelected: {
    fontWeight: 'bold',
    color: theme.colors.tint,
  },
  selectedIcon: {
    color: theme.colors.tint,
  },
  unselectedIcon: {
    color: theme.colors.textSecondary,
  },
  sharedIcon: {
    color: theme.colors.tint,
  },
  moreButton: {
    padding: 4,
    marginLeft: 8,
  },
  moreIcon: {
    color: theme.colors.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.sizes.screenPadding,
    paddingTop: 12,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
    gap: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.sizes.radiusSm,
    backgroundColor: theme.colors.tint,
  },
  addButtonText: {
    fontSize: theme.typography.fontSizeM,
    color: theme.colors.textOnTint,
    fontWeight: '600',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.sizes.radiusSm,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  joinButtonText: {
    fontSize: theme.typography.fontSizeM,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
}))

const modalStyles = StyleSheet.create((theme) => ({
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
