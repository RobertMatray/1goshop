import React, { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, Pressable, Alert, FlatList, Platform, TextInput as TextInputField, ActivityIndicator } from 'react-native'
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
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ShoppingSession } from '../../types/shopping'
import {
  createFirebaseList,
  createSharingCode,
  firebaseGetMemberCount,
  unsubscribeFromList,
  DEVICE_NAME,
} from '../../services/FirebaseSyncService'

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ListManagementScreen'>

// Sharing state per list — used inside the context menu modal
interface SharingState {
  sharingCode: string | null
  expiresAt: number | null
  timeLeft: string
  memberCount: number
  isLoading: boolean
}

interface ContextMenuState {
  list: ShoppingListMeta
  canDelete: boolean
}

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
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [sharingState, setSharingState] = useState<SharingState>({
    sharingCode: null,
    expiresAt: null,
    timeLeft: '',
    memberCount: 0,
    isLoading: false,
  })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isLoadingRef = useRef(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // When context menu opens for a shared list, load member count
  useEffect(() => {
    if (!contextMenu) return
    const list = contextMenu.list
    if (!list.isShared || !list.firebaseListId) return
    const firebaseListId = list.firebaseListId
    firebaseGetMemberCount(firebaseListId)
      .then((count) => {
        if (!isMountedRef.current) return
        setSharingState((prev) => ({ ...prev, memberCount: count }))
      })
      .catch(() => {})
  }, [contextMenu?.list.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
    [selectedListId, lists.length], // eslint-disable-line react-hooks/exhaustive-deps
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
      {contextMenu !== null && (
        <ContextMenuModal
          list={contextMenu.list}
          canDelete={contextMenu.canDelete}
          sharing={sharingState}
          onClose={closeContextMenu}
          onRename={() => {
            closeContextMenu()
            openRenameModal(contextMenu.list)
          }}
          onShare={() => handleShare(contextMenu.list)}
          onGenerateCode={() => handleGenerateCode(contextMenu.list)}
          onStopSharing={() => {
            closeContextMenu()
            confirmUnlink(contextMenu.list)
          }}
          onDelete={() => {
            closeContextMenu()
            confirmDelete(contextMenu.list)
          }}
          t={t}
        />
      )}
    </View>
  )

  function openContextMenu(item: ShoppingListMeta): void {
    // Reset sharing state when opening menu for a different list
    setSharingState({ sharingCode: null, expiresAt: null, timeLeft: '', memberCount: 0, isLoading: false })
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setContextMenu({ list: item, canDelete: lists.length > 1 })
  }

  function closeContextMenu(): void {
    setContextMenu(null)
    // Don't clear sharingCode — if the menu is re-opened while a code is active, it would be lost.
    // Timer keeps running in background; code expires naturally.
  }

  function startTimer(expiresAt: number): void {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      if (!isMountedRef.current) return
      const remaining = expiresAt - Date.now()
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = null
        setSharingState((prev) => ({ ...prev, sharingCode: null, expiresAt: null, timeLeft: '' }))
        return
      }
      const mins = Math.floor(remaining / 60000)
      const secs = Math.floor((remaining % 60000) / 1000)
      setSharingState((prev) => ({ ...prev, timeLeft: `${mins}:${secs.toString().padStart(2, '0')}` }))
    }, 1000)
  }

  async function handleShare(list: ShoppingListMeta): Promise<void> {
    if (isLoadingRef.current || list.isShared) return
    isLoadingRef.current = true
    setSharingState((prev) => ({ ...prev, isLoading: true }))

    try {
      const items = useShoppingListStore.getState().items

      let session = useActiveShoppingStore.getState().session
      if (!session) {
        const sessionRaw = await AsyncStorage.getItem(`@list_${list.id}_session`)
        if (sessionRaw) {
          try {
            const parsed: unknown = JSON.parse(sessionRaw)
            if (typeof parsed === 'object' && parsed !== null && 'id' in parsed) {
              session = parsed as ShoppingSession
            }
          } catch { /* ignore */ }
        }
      }

      let history = useActiveShoppingStore.getState().history
      if (history.length === 0) {
        const historyRaw = await AsyncStorage.getItem(`@list_${list.id}_history`)
        if (historyRaw) {
          try {
            const parsed: unknown = JSON.parse(historyRaw)
            if (Array.isArray(parsed)) {
              history = (parsed as unknown[]).filter(
                (s): s is ShoppingSession =>
                  typeof s === 'object' && s !== null && 'id' in s && 'items' in s,
              )
            }
          } catch { /* ignore */ }
        }
      }

      const firebaseListId = await createFirebaseList(list.name, DEVICE_NAME, items, session, history)
      const code = await createSharingCode(firebaseListId, list.name)

      useListsMetaStore.getState().markListAsShared(list.id, firebaseListId, code)
      await Promise.allSettled([
        useShoppingListStore.getState().switchToList(list.id),
        useActiveShoppingStore.getState().switchToList(list.id),
      ])

      if (!isMountedRef.current) return
      const expiresAt = Date.now() + 15 * 60 * 1000
      setSharingState({ sharingCode: code, expiresAt, timeLeft: '15:00', memberCount: 1, isLoading: false })
      startTimer(expiresAt)
    } catch (error) {
      console.warn('[ListManagementScreen] Failed to share:', error)
      if (isMountedRef.current) {
        setSharingState((prev) => ({ ...prev, isLoading: false }))
        Alert.alert(t('Sharing.error'), t('Sharing.shareError'))
      }
    } finally {
      isLoadingRef.current = false
    }
  }

  async function handleGenerateCode(list: ShoppingListMeta): Promise<void> {
    if (!list.firebaseListId || isLoadingRef.current) return
    isLoadingRef.current = true
    setSharingState((prev) => ({ ...prev, isLoading: true }))

    try {
      const code = await createSharingCode(list.firebaseListId, list.name)
      if (!isMountedRef.current) return
      const expiresAt = Date.now() + 15 * 60 * 1000
      setSharingState((prev) => ({ ...prev, sharingCode: code, expiresAt, timeLeft: '15:00', isLoading: false }))
      startTimer(expiresAt)
    } catch (error) {
      console.warn('[ListManagementScreen] Failed to generate code:', error)
      if (isMountedRef.current) {
        setSharingState((prev) => ({ ...prev, isLoading: false }))
        Alert.alert(t('Sharing.error'), t('Sharing.shareError'))
      }
    } finally {
      isLoadingRef.current = false
    }
  }

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

  function confirmDelete(list: ShoppingListMeta): void {
    if (list.isShared && list.firebaseListId) {
      // Check if user is the last member — if so, warn that all data will be permanently deleted
      firebaseGetMemberCount(list.firebaseListId)
        .then((memberCount) => {
          const message = memberCount <= 1
            ? t('Sharing.lastMemberDeleteWarning')
            : t('Lists.deleteListConfirm', { name: list.name })
          showDeleteAlert(list, message)
        })
        .catch(() => {
          // Offline or error — show standard confirmation without member count check
          showDeleteAlert(list, t('Lists.deleteListConfirm', { name: list.name }))
        })
    } else {
      showDeleteAlert(list, t('Lists.deleteListConfirm', { name: list.name }))
    }
  }

  function showDeleteAlert(list: ShoppingListMeta, message: string): void {
    Alert.alert(
      t('Lists.deleteList'),
      message,
      [
        { text: t('ShoppingList.cancel'), style: 'cancel' },
        {
          text: t('ShoppingList.delete'),
          style: 'destructive',
          onPress: async () => {
            setContextMenu(null)
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
            } catch {
              // deleteList zlyhalo (Firebase offline) — obnov subscription a zobraz error
              Alert.alert(t('Sharing.error'), t('Sharing.deleteError'))
              if (list.firebaseListId) {
                void useShoppingListStore.getState().switchToList(list.id)
              }
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
          setContextMenu(null)
          try {
            // unsubscribe pred unlinkList — listener nesmie bežať počas Firebase leave
            if (list.firebaseListId) {
              unsubscribeFromList(list.firebaseListId)
            }
            await useListsMetaStore.getState().unlinkList(list.id)
            const { selectedListId: currentId } = useListsMetaStore.getState()
            if (currentId === list.id) {
              await useShoppingListStore.getState().switchToList(list.id)
            }
          } catch {
            // Firebase leave zlyhalo — obnov subscription a zobraz error
            Alert.alert(t('Sharing.error'), t('Sharing.unlinkError'))
            if (list.firebaseListId) {
              void useShoppingListStore.getState().switchToList(list.id)
            }
          }
        },
      },
    ])
  }
}

// ─── Context Menu Modal ──────────────────────────────────────────────────────

interface ContextMenuModalProps {
  list: ShoppingListMeta
  canDelete: boolean
  sharing: SharingState
  onClose: () => void
  onRename: () => void
  onShare: () => void
  onGenerateCode: () => void
  onStopSharing: () => void
  onDelete: () => void
  t: (key: string, opts?: Record<string, unknown>) => string
}

function ContextMenuModal({
  list, canDelete, sharing, onClose, onRename, onShare, onGenerateCode, onStopSharing, onDelete, t,
}: ContextMenuModalProps): React.ReactElement {
  const { sharingCode, timeLeft, memberCount, isLoading } = sharing

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={menuStyles.overlay} onPress={onClose}>
        <Pressable style={menuStyles.container} onPress={() => {}}>

          {/* Header: list name + sharing status */}
          <View style={menuStyles.header}>
            <Text style={menuStyles.title} numberOfLines={1}>{list.name}</Text>
            {list.isShared && (
              <View style={menuStyles.sharedBadge}>
                <Ionicons name="people" size={13} color={menuStyles.sharedBadgeText.color as string} />
                <Text style={menuStyles.sharedBadgeText}>
                  {t('Sharing.membersCount', { count: memberCount })}
                </Text>
              </View>
            )}
          </View>

          {/* Active sharing code block */}
          {sharingCode && (
            <View style={menuStyles.codeBlock}>
              <Text style={menuStyles.codeLabel}>{t('Sharing.codeTitle')}</Text>
              <Text style={menuStyles.codeText}>{sharingCode}</Text>
              <Text style={menuStyles.codeInstructions}>{t('Sharing.codeInstructions')}</Text>
              {timeLeft !== '' && (() => {
                const [mins = '0', secs = '00'] = timeLeft.split(':')
                return (
                  <Text style={menuStyles.codeExpires}>
                    {t('Sharing.codeExpires', { minutes: mins, seconds: secs })}
                  </Text>
                )
              })()}
            </View>
          )}

          {/* Menu items */}
          <Pressable style={menuStyles.menuItem} onPress={onRename}>
            <Ionicons name="pencil-outline" size={20} color={menuStyles.menuItemText.color as string} />
            <Text style={menuStyles.menuItemText}>{t('Lists.renameList')}</Text>
          </Pressable>

          {!list.isShared && (
            <Pressable style={menuStyles.menuItem} onPress={onShare} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator size="small" color={menuStyles.menuItemText.color as string} />
              ) : (
                <Ionicons name="share-outline" size={20} color={menuStyles.menuItemText.color as string} />
              )}
              <Text style={menuStyles.menuItemText}>{t('Sharing.shareButton')}</Text>
            </Pressable>
          )}

          {list.isShared && !sharingCode && (
            <Pressable style={menuStyles.menuItem} onPress={onGenerateCode} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator size="small" color={menuStyles.menuItemText.color as string} />
              ) : (
                <Ionicons name="share-outline" size={20} color={menuStyles.menuItemText.color as string} />
              )}
              <Text style={menuStyles.menuItemText}>{t('Sharing.shareButton')}</Text>
            </Pressable>
          )}

          {list.isShared && (
            <Pressable style={menuStyles.menuItem} onPress={onStopSharing}>
              <Ionicons name="link-outline" size={20} color={menuStyles.menuItemDestructiveText.color as string} />
              <Text style={menuStyles.menuItemDestructiveText}>{t('Sharing.stopSharing')}</Text>
            </Pressable>
          )}

          {canDelete && (
            <Pressable style={menuStyles.menuItem} onPress={onDelete}>
              <Ionicons name="trash-outline" size={20} color={menuStyles.menuItemDestructiveText.color as string} />
              <Text style={menuStyles.menuItemDestructiveText}>{t('Lists.deleteList')}</Text>
            </Pressable>
          )}

          <Pressable style={[menuStyles.menuItem, menuStyles.cancelItem]} onPress={onClose}>
            <Text style={menuStyles.cancelText}>{t('ShoppingList.cancel')}</Text>
          </Pressable>

        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ─── Text Input Modal ────────────────────────────────────────────────────────

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

// ─── Styles ──────────────────────────────────────────────────────────────────

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

const menuStyles = StyleSheet.create((theme) => ({
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
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
    gap: 4,
  },
  title: {
    fontSize: theme.typography.fontSizeM,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sharedBadgeText: {
    fontSize: 12,
    color: theme.colors.tint,
  },
  codeBlock: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: theme.sizes.radiusSm,
    backgroundColor: theme.colors.tint + '10',
    borderWidth: 1,
    borderColor: theme.colors.tint + '30',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  codeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.tint,
    letterSpacing: 6,
  },
  codeInstructions: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  codeExpires: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  menuItemText: {
    fontSize: theme.typography.fontSizeM,
    color: theme.colors.text,
  },
  menuItemDestructiveText: {
    fontSize: theme.typography.fontSizeM,
    color: theme.colors.danger,
  },
  cancelItem: {
    justifyContent: 'center',
    borderBottomWidth: 0,
  },
  cancelText: {
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
