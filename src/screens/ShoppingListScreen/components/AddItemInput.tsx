import React, { useRef } from 'react'
import { View, TextInput, Pressable, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet } from 'react-native-unistyles'
import { useTranslation } from 'react-i18next'
import { useShoppingListStore } from '../../../stores/ShoppingListStore'

interface Props {
  filterText: string
  onFilterTextChange: (text: string) => void
  onClearFilter: () => void
}

export function AddItemInput({ filterText, onFilterTextChange, onClearFilter }: Props): React.ReactElement {
  const inputRef = useRef<TextInput>(null)
  const addItem = useShoppingListStore((s) => s.addItem)
  const { t } = useTranslation()
  const hasText = filterText.trim().length > 0

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={filterText}
          onChangeText={onFilterTextChange}
          placeholder={t('ShoppingList.addPlaceholder')}
          placeholderTextColor={styles.placeholder.color}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
        />
        {filterText.length > 0 && (
          <Pressable onPress={handleClear} style={styles.clearButton} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={styles.clearIcon.color} />
          </Pressable>
        )}
      </View>
      <Pressable
        style={[styles.button, !hasText && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!hasText}
      >
        <Text style={styles.buttonText}>+</Text>
      </Pressable>
    </View>
  )

  function handleSubmit(): void {
    if (!hasText) return
    addItem(filterText)
    onClearFilter()
    inputRef.current?.focus()
  }

  function handleClear(): void {
    onClearFilter()
    inputRef.current?.focus()
  }
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: 'row',
    padding: theme.sizes.screenPadding,
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.sizes.radiusSm,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: theme.typography.fontSizeM,
    color: theme.colors.text,
  },
  placeholder: {
    color: theme.colors.textSecondary,
  },
  clearButton: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearIcon: {
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
