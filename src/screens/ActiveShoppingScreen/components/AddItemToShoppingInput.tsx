import React, { useRef, useMemo } from 'react'
import { View, TextInput, Pressable, Text, FlatList } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet } from 'react-native-unistyles'
import { useTranslation } from 'react-i18next'
import { useShoppingListStore } from '../../../stores/ShoppingListStore'
import { useActiveShoppingStore } from '../../../stores/ActiveShoppingStore'
import type { ShoppingItem } from '../../../types/shopping'

interface Props {
  filterText: string
  onFilterTextChange: (text: string) => void
  onClearFilter: () => void
}

export function AddItemToShoppingInput({ filterText, onFilterTextChange, onClearFilter }: Props): React.ReactElement {
  const inputRef = useRef<TextInput>(null)
  const { t } = useTranslation()
  const hasText = filterText.trim().length > 0

  const shoppingListItems = useShoppingListStore((s) => s.items)
  const sessionItems = useActiveShoppingStore((s) => s.session?.items)

  const suggestions = useMemo(() => {
    if (!hasText) return []
    const needle = filterText.trim().toLowerCase()
    const sessionIds = new Set(sessionItems?.map((i) => i.id) ?? [])
    return shoppingListItems
      .filter((item) => item.name.toLowerCase().includes(needle) && !sessionIds.has(item.id))
      .sort((a, b) => a.order - b.order)
  }, [filterText, hasText, shoppingListItems, sessionItems])

  return (
    <View>
      <View style={styles.container}>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={filterText}
            onChangeText={onFilterTextChange}
            placeholder={t('ActiveShopping.addPlaceholder')}
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
      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.suggestion} onPress={() => handleAddExisting(item)}>
              <Ionicons name="add-circle-outline" size={20} color={styles.suggestionText.color} />
              <Text style={styles.suggestionText}>{item.name}</Text>
              {item.quantity > 1 && (
                <Text style={styles.suggestionQuantity}>×{item.quantity}</Text>
              )}
            </Pressable>
          )}
          style={styles.suggestionsList}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  )

  function handleSubmit(): void {
    if (!hasText) return
    const trimmed = filterText.trim()

    // Check if this item already exists in the shopping list
    const existing = shoppingListItems.find(
      (item) => item.name.toLowerCase() === trimmed.toLowerCase(),
    )

    if (existing) {
      handleAddExisting(existing)
    } else {
      // Add to shopping list first (at the end), then add to active session
      const addItem = useShoppingListStore.getState().addItem
      addItem(trimmed)

      // Get the newly added item (last in the list)
      const updatedItems = useShoppingListStore.getState().items
      const newItem = updatedItems[updatedItems.length - 1]
      if (newItem) {
        useActiveShoppingStore.getState().addItemToSession(newItem, null)
      }
    }

    onClearFilter()
    inputRef.current?.focus()
  }

  function handleAddExisting(item: ShoppingItem): void {
    useActiveShoppingStore.getState().addItemToSession(item, item.order)
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
  suggestionsList: {
    maxHeight: 200,
    marginHorizontal: theme.sizes.screenPadding,
    marginBottom: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.sizes.radiusSm,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  suggestionText: {
    flex: 1,
    fontSize: theme.typography.fontSizeM,
    color: theme.colors.text,
  },
  suggestionQuantity: {
    fontSize: theme.typography.fontSizeS,
    color: theme.colors.textSecondary,
  },
}))
