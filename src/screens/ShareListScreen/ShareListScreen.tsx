import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { StyleSheet } from 'react-native-unistyles'
import { useTranslation } from 'react-i18next'
import { useRoute, useFocusEffect } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { RootStackParamList } from '../../navigation/AppNavigator'
import { useListsMetaStore } from '../../stores/ListsMetaStore'
import { useShoppingListStore } from '../../stores/ShoppingListStore'
import { useActiveShoppingStore } from '../../stores/ActiveShoppingStore'
import type { ShoppingSession } from '../../types/shopping'
import {
  createFirebaseList,
  createSharingCode,
  firebaseGetMemberCount,
  firebaseLeaveList,
} from '../../services/FirebaseSyncService'

type ShareListRoute = RouteProp<RootStackParamList, 'ShareListScreen'>

export function ShareListScreen(): React.ReactElement {
  const { t } = useTranslation()
  const route = useRoute<ShareListRoute>()
  const { listId } = route.params
  const list = useListsMetaStore((s) => s.lists.find((l) => l.id === listId))
  const [sharingCode, setSharingCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [memberCount, setMemberCount] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isUnlinkingRef = useRef(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const isShared = list?.isShared ?? false

  useEffect(() => {
    if (isShared && list?.firebaseListId) {
      firebaseGetMemberCount(list.firebaseListId).then(setMemberCount).catch(() => {})
    }
  }, [isShared, list?.firebaseListId])

  useEffect(() => {
    if (!expiresAt) return
    timerRef.current = setInterval(() => {
      const remaining = expiresAt - Date.now()
      if (remaining <= 0) {
        setTimeLeft('0:00')
        setSharingCode(null)
        setExpiresAt(null)
        if (timerRef.current) clearInterval(timerRef.current)
        checkAndAutoUnlink()
        return
      }
      const mins = Math.floor(remaining / 60000)
      const secs = Math.floor((remaining % 60000) / 1000)
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`)
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [expiresAt])

  // When leaving the screen, check if nobody joined and auto-unlink
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Screen losing focus — check if we should auto-unlink
        checkAndAutoUnlink()
      }
    }, [list?.firebaseListId, list?.isShared]),
  )

  if (!list) return <View style={styles.container} />

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.listName}>{list.name}</Text>

        {!isShared && !sharingCode && (
          <>
            <Text style={styles.description}>{t('Sharing.shareDescription')}</Text>
            <Pressable
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleShare}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={styles.buttonText.color as string} />
              ) : (
                <Text style={styles.buttonText}>{t('Sharing.shareButton')}</Text>
              )}
            </Pressable>
          </>
        )}

        {sharingCode && (
          <>
            <Text style={styles.codeTitle}>{t('Sharing.codeTitle')}</Text>
            <Text style={styles.codeText}>{sharingCode}</Text>
            <Text style={styles.codeInstructions}>{t('Sharing.codeInstructions')}</Text>
            <Text style={styles.codeExpires}>
              {t('Sharing.codeExpires', {
                minutes: timeLeft.split(':')[0],
                seconds: timeLeft.split(':')[1],
              })}
            </Text>
          </>
        )}

        {isShared && !sharingCode && (
          <>
            <Text style={styles.sharedStatus}>{t('Sharing.alreadyShared')}</Text>
            <Text style={styles.membersCount}>
              {t('Sharing.membersCount', { count: memberCount })}
            </Text>

            <Pressable
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleGenerateNewCode}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={styles.buttonText.color as string} />
              ) : (
                <Text style={styles.buttonText}>{t('Sharing.shareButton')}</Text>
              )}
            </Pressable>

            <Pressable style={styles.unlinkButton} onPress={handleUnlink}>
              <Text style={styles.unlinkButtonText}>{t('Sharing.stopSharing')}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  )

  async function checkAndAutoUnlink(): Promise<void> {
    if (isUnlinkingRef.current || !isMountedRef.current) return
    isUnlinkingRef.current = true

    try {
      const currentList = useListsMetaStore.getState().lists.find((l) => l.id === listId)
      if (!currentList?.isShared || !currentList.firebaseListId) return

      const count = await firebaseGetMemberCount(currentList.firebaseListId)
      if (count <= 1) {
        // Only the owner — nobody joined, revert to local-only
        await firebaseLeaveList(currentList.firebaseListId).catch(() => {})
        useListsMetaStore.getState().unlinkList(listId)
        // Re-subscribe store to use local data instead of Firebase
        const selectedListId = useListsMetaStore.getState().selectedListId
        if (selectedListId === listId) {
          await useShoppingListStore.getState().switchToList(listId)
        }
      }
    } catch {
      // Network error — don't auto-unlink, keep current state
    } finally {
      isUnlinkingRef.current = false
    }
  }

  async function handleShare(): Promise<void> {
    if (!list) return
    setIsLoading(true)
    try {
      const items = useShoppingListStore.getState().items

      // Load session from AsyncStorage if store doesn't have it
      let session = useActiveShoppingStore.getState().session
      if (!session) {
        const sessionRaw = await AsyncStorage.getItem(`@list_${listId}_session`)
        if (sessionRaw) {
          const parsed: unknown = JSON.parse(sessionRaw)
          if (typeof parsed === 'object' && parsed !== null && 'id' in parsed) {
            session = parsed as ShoppingSession
          }
        }
      }

      // Load history from AsyncStorage directly — store may not have it loaded yet
      let history = useActiveShoppingStore.getState().history
      if (history.length === 0) {
        const historyRaw = await AsyncStorage.getItem(`@list_${listId}_history`)
        if (historyRaw) {
          const parsed: unknown = JSON.parse(historyRaw)
          if (Array.isArray(parsed)) {
            history = parsed as ShoppingSession[]
          }
        }
      }

      const deviceId = useListsMetaStore.getState().deviceId
      const firebaseListId = await createFirebaseList(
        list.name,
        deviceId,
        'My device',
        items,
        session,
        history,
      )

      const code = await createSharingCode(firebaseListId, list.name)

      useListsMetaStore.getState().markListAsShared(listId, firebaseListId, code)
      setSharingCode(code)
      setExpiresAt(Date.now() + 15 * 60 * 1000)
    } catch (error) {
      console.warn('[ShareListScreen] Failed to share:', error)
      Alert.alert(t('Sharing.error'), t('Sharing.shareError'))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGenerateNewCode(): Promise<void> {
    if (!list?.firebaseListId) return
    setIsLoading(true)
    try {
      const code = await createSharingCode(list.firebaseListId, list.name)
      setSharingCode(code)
      setExpiresAt(Date.now() + 15 * 60 * 1000)
    } catch (error) {
      console.warn('[ShareListScreen] Failed to generate code:', error)
      Alert.alert(t('Sharing.error'), t('Sharing.shareError'))
    } finally {
      setIsLoading(false)
    }
  }

  function handleUnlink(): void {
    Alert.alert(t('Sharing.unlinkTitle'), t('Sharing.unlinkConfirm'), [
      { text: t('ShoppingList.cancel'), style: 'cancel' },
      {
        text: t('Sharing.stopSharing'),
        style: 'destructive',
        onPress: async () => {
          if (list?.firebaseListId) {
            await firebaseLeaveList(list.firebaseListId).catch(() => {})
          }
          useListsMetaStore.getState().unlinkList(listId)
        },
      },
    ])
  }
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.sizes.screenPadding,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.sizes.radiusLg,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    alignItems: 'center',
  },
  listName: {
    fontSize: theme.typography.fontSizeL,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  description: {
    fontSize: theme.typography.fontSizeS,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: theme.colors.tint,
    borderRadius: theme.sizes.radiusSm,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.textOnTint,
    fontSize: theme.typography.fontSizeM,
    fontWeight: 'bold',
  },
  codeTitle: {
    fontSize: theme.typography.fontSizeM,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  codeText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: theme.colors.tint,
    letterSpacing: 8,
    marginBottom: 16,
    fontFamily: undefined,
  },
  codeInstructions: {
    fontSize: theme.typography.fontSizeS,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  codeExpires: {
    fontSize: theme.typography.fontSizeS,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  sharedStatus: {
    fontSize: theme.typography.fontSizeM,
    fontWeight: 'bold',
    color: theme.colors.tint,
    marginBottom: 8,
  },
  membersCount: {
    fontSize: theme.typography.fontSizeS,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  unlinkButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.sizes.radiusSm,
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  unlinkButtonText: {
    color: theme.colors.danger,
    fontSize: theme.typography.fontSizeS,
    fontWeight: '600',
  },
}))
