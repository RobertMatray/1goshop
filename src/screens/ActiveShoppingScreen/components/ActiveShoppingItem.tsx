import React from 'react'
import { Pressable, View, Text } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import * as Haptics from 'expo-haptics'
import type { ActiveShoppingItem as ActiveShoppingItemType } from '../../../types/shopping'

interface Props {
  item: ActiveShoppingItemType
  onToggleBought: (id: string) => void
}

export const ActiveShoppingItem = React.memo(function ActiveShoppingItem({ item, onToggleBought }: Props): React.ReactElement {
  return (
    <Pressable style={styles.outerContainer} onPress={handlePress}>
      <View style={[styles.itemContainer, item.isBought && styles.itemBought]}>
        <View style={styles.checkbox}>
          {item.isBought && <Text style={styles.checkmark}>✓</Text>}
        </View>

        <Text
          style={[styles.itemName, item.isBought && styles.itemNameBought]}
          numberOfLines={1}
        >
          {item.name}
        </Text>

        {item.quantity > 1 && (
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityText}>x{item.quantity}</Text>
          </View>
        )}
      </View>
    </Pressable>
  )

  function handlePress(): void {
    onToggleBought(item.id)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }
})

const styles = StyleSheet.create((theme) => ({
  outerContainer: {
    marginHorizontal: theme.sizes.screenPadding,
    marginVertical: 2,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.sizes.radiusSm,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: theme.sizes.itemHeight,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  itemBought: {
    backgroundColor: theme.colors.checked,
    borderColor: theme.colors.checked,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: theme.colors.tint,
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemName: {
    flex: 1,
    fontSize: theme.typography.fontSizeM,
    color: theme.colors.text,
  },
  itemNameBought: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
  },
  quantityBadge: {
    backgroundColor: theme.colors.quantityBg,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  quantityText: {
    fontSize: theme.typography.fontSizeS,
    fontWeight: 'bold',
    color: theme.colors.tint,
  },
}))
