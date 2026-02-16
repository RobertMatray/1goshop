import React, { useState } from 'react'
import { View, TextInput, Pressable, Text } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { useTranslation } from 'react-i18next'
import { useShoppingListStore } from '../../../stores/ShoppingListStore'

export function AddItemInput(): React.ReactElement {
  const [text, setText] = useState('')
  const addItem = useShoppingListStore((s) => s.addItem)
  const { t } = useTranslation()

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={t('ShoppingList.addPlaceholder')}
        placeholderTextColor={styles.placeholder.color}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
      />
      <Pressable
        style={[styles.button, !text.trim() && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!text.trim()}
      >
        <Text style={styles.buttonText}>+</Text>
      </Pressable>
    </View>
  )

  function handleSubmit(): void {
    if (!text.trim()) return
    addItem(text)
    setText('')
  }
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: 'row',
    padding: theme.sizes.screenPadding,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.sizes.radiusSm,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: theme.typography.fontSizeM,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  placeholder: {
    color: theme.colors.textSecondary,
  },
  button: {
    backgroundColor: theme.colors.tint,
    borderRadius: theme.sizes.radiusSm,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: theme.colors.textOnTint,
    fontSize: 24,
    fontWeight: 'bold',
  },
}))
