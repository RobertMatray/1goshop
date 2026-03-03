import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../navigation/AppNavigator'
import { useListsMetaStore } from '../../stores/ListsMetaStore'
import { useShoppingListStore } from '../../stores/ShoppingListStore'
import { useActiveShoppingStore } from '../../stores/ActiveShoppingStore'
import { joinSharedList, DEVICE_NAME } from '../../services/FirebaseSyncService'
import { debugLog } from '../../services/DebugLogger'

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'JoinListScreen'>

export function JoinListScreen(): React.ReactElement {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isValid = code.replace(/\s/g, '').length === 6

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('Sharing.joinTitle')}</Text>
        <Text style={styles.description}>{t('Sharing.joinDescription')}</Text>

        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={handleCodeChange}
          placeholder={t('Sharing.joinPlaceholder')}
          placeholderTextColor={styles.placeholder.color as string}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          textAlign="center"
        />

        <Pressable
          style={[styles.button, (!isValid || isLoading) && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={!isValid || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={styles.buttonText.color as string} />
          ) : (
            <Text style={styles.buttonText}>{t('Sharing.joinButton')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  )

  function handleCodeChange(text: string): void {
    const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (clean.length <= 6) {
      setCode(clean)
    }
  }

  async function handleJoin(): Promise<void> {
    const cleanCode = code.replace(/\s/g, '').toUpperCase()
    if (cleanCode.length !== 6) return

    setIsLoading(true)
    try {
      debugLog('Join', `Joining with code: ${cleanCode}`)
      const result = await joinSharedList(cleanCode, DEVICE_NAME)
      if (!result) {
        debugLog('Join', 'joinSharedList returned null — invalid/expired code')
        Alert.alert(t('Sharing.error'), t('Sharing.joinError'))
        return
      }

      debugLog('Join', `Join OK: firebaseListId=${result.firebaseListId}, name="${result.listName}"`)

      // Check if already joined this Firebase list — prevent duplicates
      const existingList = useListsMetaStore.getState().lists.find(
        (l) => l.firebaseListId === result.firebaseListId,
      )
      if (existingList) {
        debugLog('Join', `Already joined — switching to existing list: ${existingList.id}`)
        // Already joined — just switch to existing list
        useListsMetaStore.getState().selectList(existingList.id)
        await Promise.allSettled([
          useShoppingListStore.getState().switchToList(existingList.id),
          useActiveShoppingStore.getState().switchToList(existingList.id),
        ])
        Alert.alert(
          t('Sharing.joinSuccess', { name: result.listName }),
          undefined,
          [{ text: 'OK', onPress: () => navigation.popToTop() }],
        )
        return
      }

      // Check if there's an unlinked local list that was previously connected to this Firebase list
      // This happens when user unlinks and then re-joins the same shared list
      const unlinkedList = useListsMetaStore.getState().lists.find(
        (l) => !l.isShared && !l.firebaseListId && l.name === result.listName,
      )

      let listId: string
      if (unlinkedList) {
        debugLog('Join', `Re-linking unlinked list: ${unlinkedList.id}`)
        // Re-link existing local list instead of creating a duplicate
        useListsMetaStore.getState().markListAsShared(unlinkedList.id, result.firebaseListId, cleanCode)
        listId = unlinkedList.id
      } else {
        // Create new local list entry linked to Firebase
        listId = useListsMetaStore.getState().createList(result.listName)
        useListsMetaStore.getState().markListAsShared(listId, result.firebaseListId, cleanCode)
        debugLog('Join', `Created new local list: ${listId}, marked as shared`)
      }

      // Switch to the joined list
      debugLog('Join', `Switching to joined list: ${listId}`)
      useListsMetaStore.getState().selectList(listId)
      await Promise.allSettled([
        useShoppingListStore.getState().switchToList(listId),
        useActiveShoppingStore.getState().switchToList(listId),
      ])

      Alert.alert(
        t('Sharing.joinSuccess', { name: result.listName }),
        undefined,
        [{ text: 'OK', onPress: () => navigation.popToTop() }],
      )
    } catch (error) {
      console.warn('[JoinListScreen] Failed to join:', error)
      const isNetworkError =
        error instanceof Error &&
        (error.message.includes('network') ||
          error.message.includes('timeout') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('NETWORK_ERROR'))
      Alert.alert(
        t('Sharing.error'),
        isNetworkError ? t('Sharing.networkError') : t('Sharing.joinError'),
      )
    } finally {
      setIsLoading(false)
    }
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
  title: {
    fontSize: theme.typography.fontSizeL,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: theme.typography.fontSizeS,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  codeInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: 6,
    borderWidth: 2,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: theme.sizes.radiusSm,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 24,
  },
  placeholder: {
    color: theme.colors.textSecondary,
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
    opacity: 0.4,
  },
  buttonText: {
    color: theme.colors.textOnTint,
    fontSize: theme.typography.fontSizeM,
    fontWeight: 'bold',
  },
}))
