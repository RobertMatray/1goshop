import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import { StyleSheet } from 'react-native-unistyles'
import * as Haptics from 'expo-haptics'
import type { ShoppingItem } from '../../../types/shopping'
import { useShoppingListStore } from '../../../stores/ShoppingListStore'

interface Props {
  item: ShoppingItem
}

const SWIPE_THRESHOLD = 80
const DELETE_THRESHOLD = 160

export function ShoppingListItem({ item }: Props): React.ReactElement {
  const translateX = useSharedValue(0)
  const itemHeight = useSharedValue(60)
  const itemOpacity = useSharedValue(1)
  const isDeleting = useSharedValue(false)

  const incrementQuantity = useShoppingListStore((s) => s.incrementQuantity)
  const removeItem = useShoppingListStore((s) => s.removeItem)
  const toggleChecked = useShoppingListStore((s) => s.toggleChecked)

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      translateX.value = event.translationX
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(onIncrementQuantity)()
        translateX.value = withSpring(0)
      } else if (event.translationX < -DELETE_THRESHOLD) {
        isDeleting.value = true
        translateX.value = withTiming(-400, { duration: 200 })
        itemHeight.value = withTiming(0, { duration: 200 })
        itemOpacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onRemoveItem)()
        })
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SWIPE_THRESHOLD)
      } else {
        translateX.value = withSpring(0)
      }
    })

  const tapGesture = Gesture.Tap().onEnd(() => {
    if (translateX.value < -40) {
      translateX.value = withSpring(0)
    } else {
      runOnJS(onToggleChecked)()
    }
  })

  const composedGesture = Gesture.Race(panGesture, tapGesture)

  const animatedItemStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: isDeleting.value ? itemHeight.value : undefined,
    opacity: itemOpacity.value,
    overflow: 'hidden' as const,
  }))

  const rightActionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [0, -SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP)
    return { opacity }
  })

  const leftActionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP)
    return { opacity }
  })

  return (
    <Animated.View style={animatedContainerStyle}>
      <View style={styles.swipeContainer}>
        <Animated.View style={[styles.leftAction, leftActionStyle]}>
          <Text style={styles.actionText}>+1</Text>
        </Animated.View>

        <Animated.View style={[styles.rightAction, rightActionStyle]}>
          <Pressable onPress={onRemoveItem} style={styles.deleteButton}>
            <Text style={styles.actionText}>🗑</Text>
          </Pressable>
        </Animated.View>

        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.itemContainer, item.isChecked && styles.itemChecked, animatedItemStyle]}>
            <View style={styles.checkbox}>
              {item.isChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>

            <Text
              style={[styles.itemName, item.isChecked && styles.itemNameChecked]}
              numberOfLines={1}
            >
              {item.name}
            </Text>

            {item.quantity > 1 && (
              <View style={styles.quantityBadge}>
                <Text style={styles.quantityText}>x{item.quantity}</Text>
              </View>
            )}
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  )

  function onIncrementQuantity(): void {
    incrementQuantity(item.id)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  function onRemoveItem(): void {
    removeItem(item.id)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  function onToggleChecked(): void {
    toggleChecked(item.id)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }
}

const styles = StyleSheet.create((theme) => ({
  swipeContainer: {
    position: 'relative',
    marginHorizontal: theme.sizes.screenPadding,
    marginVertical: 2,
  },
  leftAction: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_THRESHOLD,
    backgroundColor: theme.colors.tint,
    borderRadius: theme.sizes.radiusSm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_THRESHOLD,
    backgroundColor: theme.colors.danger,
    borderRadius: theme.sizes.radiusSm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  actionText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
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
  itemChecked: {
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
  itemNameChecked: {
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
