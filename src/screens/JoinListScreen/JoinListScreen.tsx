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
import { joinSharedList } from '../../services/FirebaseSyncService'

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
      const result = await joinSharedList(cleanCode, 'My device')
      if (!result) {
        Alert.alert(t('Sharing.error'), t('Sharing.joinError'))
        return
      }

      // Create local list entry linked to Firebase
      const newId = useListsMetaStore.getState().createList(result.listName)
      useListsMetaStore.getState().markListAsShared(newId, result.firebaseListId, cleanCode)

      // Switch to the new list
      useListsMetaStore.getState().selectList(newId)
      await Promise.allSettled([
        useShoppingListStore.getState().switchToList(newId),
        useActiveShoppingStore.getState().switchToList(newId),
      ])

      Alert.alert(
        t('Sharing.joinSuccess', { name: result.listName }),
        undefined,
        [{ text: 'OK', onPress: () => navigation.popToTop() }],
      )
    } catch (error) {
      console.warn('[JoinListScreen] Failed to join:', error)
      Alert.alert(t('Sharing.error'), t('Sharing.joinError'))
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
