import React, { useCallback } from 'react'
import { View, Text, Alert, Pressable, LayoutChangeEvent } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import { StyleSheet } from 'react-native-unistyles'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import type { ShoppingItem } from '../../../types/shopping'
import { useShoppingListStore } from '../../../stores/ShoppingListStore'

interface Props {
  item: ShoppingItem
  drag?: () => void
  isActive?: boolean
}

const SWIPE_THRESHOLD = 30

export function ShoppingListItem({ item, drag, isActive }: Props): React.ReactElement {
  const translateX = useSharedValue(0)
  const itemWidth = useSharedValue(0)
  const startX = useSharedValue(0)
  const { t } = useTranslation()

  const editItem = useShoppingListStore((s) => s.editItem)
  const incrementQuantity = useShoppingListStore((s) => s.incrementQuantity)
  const decrementQuantity = useShoppingListStore((s) => s.decrementQuantity)
  const removeItem = useShoppingListStore((s) => s.removeItem)
  const toggleChecked = useShoppingListStore((s) => s.toggleChecked)

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    itemWidth.value = event.nativeEvent.layout.width
  }, [itemWidth])

  const panGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-8, 8])
    .onStart((event) => {
      startX.value = event.x
    })
    .onUpdate((event) => {
      const isLeftHalf = startX.value < itemWidth.value / 2

      if (isLeftHalf) {
        // Left half: swipe left (delete), swipe right (edit)
        translateX.value = event.translationX
      } else {
        // Right half: both directions (+1/-1)
        translateX.value = event.translationX
      }
    })
    .onEnd((event) => {
      const isLeftHalf = startX.value < itemWidth.value / 2

      if (isLeftHalf) {
        if (event.translationX < -SWIPE_THRESHOLD) {
          runOnJS(onConfirmDelete)()
        } else if (event.translationX > SWIPE_THRESHOLD) {
          runOnJS(onEditItem)()
        }
      } else {
        if (event.translationX > SWIPE_THRESHOLD) {
          runOnJS(onIncrementQuantity)()
        } else if (event.translationX < -SWIPE_THRESHOLD) {
          runOnJS(onDecrementQuantity)()
        }
      }

      translateX.value = withSpring(0, { damping: 15, stiffness: 150 })
    })

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(onToggleChecked)()
  })

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture)

  const animatedItemStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  const plusBgStyle = useAnimatedStyle(() => {
    const isRightHalf = startX.value >= itemWidth.value / 2
    const show = isRightHalf && translateX.value > 0
    const opacity = show
      ? interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP)
      : 0
    return { opacity }
  })

  const minusBgStyle = useAnimatedStyle(() => {
    const isRightHalf = startX.value >= itemWidth.value / 2
    const show = isRightHalf && translateX.value < 0
    const opacity = show
      ? interpolate(translateX.value, [0, -SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP)
      : 0
    return { opacity }
  })

  const deleteBgStyle = useAnimatedStyle(() => {
    const isLeftHalf = startX.value < itemWidth.value / 2
    const show = isLeftHalf && translateX.value < 0
    const opacity = show
      ? interpolate(translateX.value, [0, -SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP)
      : 0
    return { opacity }
  })

  const editBgStyle = useAnimatedStyle(() => {
    const isLeftHalf = startX.value < itemWidth.value / 2
    const show = isLeftHalf && translateX.value > 0
    const opacity = show
      ? interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP)
      : 0
    return { opacity }
  })

  return (
    <View style={[styles.outerContainer, isActive && styles.activeItem]} onLayout={onLayout}>
      <View style={styles.swipeContainer}>
        {/* Delete background (left half, swipe left) */}
        <Animated.View style={[styles.bgAction, styles.bgDelete, deleteBgStyle]}>
          <Text style={styles.actionText}>{'\uD83D\uDDD1'}</Text>
        </Animated.View>

        {/* Edit background (left half, swipe right) */}
        <Animated.View style={[styles.bgAction, styles.bgEdit, editBgStyle]}>
          <Text style={styles.actionText}>{'\u270F\uFE0F'}</Text>
        </Animated.View>

        {/* +1 background (right half, swipe right) */}
        <Animated.View style={[styles.bgAction, styles.bgPlus, plusBgStyle]}>
          <Text style={styles.actionText}>+1</Text>
        </Animated.View>

        {/* -1 background (right half, swipe left) */}
        <Animated.View style={[styles.bgAction, styles.bgMinus, minusBgStyle]}>
          <Text style={styles.actionText}>-1</Text>
        </Animated.View>

        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.itemContainer, item.isChecked && styles.itemChecked, animatedItemStyle]}>
            <View style={styles.itemContent} pointerEvents="none">
              <View style={styles.checkbox}>
                {item.isChecked && <Text style={styles.checkmark}>✓</Text>}
              </View>

              <Text
                style={[
                  styles.itemName,
                  item.isChecked && styles.itemNameChecked,
                  item.isChecked && { fontWeight: 'bold' as const },
                ]}
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

            {drag !== undefined && (
              <Pressable
                onLongPress={onDragStart}
                delayLongPress={200}
                style={styles.dragHandleArea}
                hitSlop={8}
              >
                <Text style={styles.dragHandle}>☰</Text>
              </Pressable>
            )}
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  )

  function onDragStart(): void {
    if (drag) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      drag()
    }
  }

  function onIncrementQuantity(): void {
    incrementQuantity(item.id)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  function onDecrementQuantity(): void {
    if (item.quantity <= 1) return
    decrementQuantity(item.id)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  function onEditItem(): void {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Alert.prompt(
      t('ShoppingList.editTitle'),
      undefined,
      [
        { text: t('ShoppingList.cancel'), style: 'cancel' },
        {
          text: t('ShoppingList.save'),
          onPress: (value: string | undefined) => {
            if (value && value.trim()) {
              editItem(item.id, value)
            }
          },
        },
      ],
      'plain-text',
      item.name,
    )
  }

  function onConfirmDelete(): void {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert(
      t('ShoppingList.deleteTitle'),
      t('ShoppingList.deleteMessage', { name: item.name }),
      [
        { text: t('ShoppingList.cancel'), style: 'cancel' },
        {
          text: t('ShoppingList.delete'),
          style: 'destructive',
          onPress: () => removeItem(item.id),
        },
      ],
    )
  }

  function onToggleChecked(): void {
    toggleChecked(item.id)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }
}

const styles = StyleSheet.create((theme) => ({
  outerContainer: {
    marginHorizontal: theme.sizes.screenPadding,
    marginVertical: 2,
  },
  activeItem: {
    opacity: 0.9,
    transform: [{ scale: 1.03 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  swipeContainer: {
    position: 'relative',
  },
  bgAction: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: theme.sizes.radiusSm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bgPlus: {
    backgroundColor: theme.colors.tint,
    justifyContent: 'flex-start',
  },
  bgMinus: {
    backgroundColor: '#FF9800',
    justifyContent: 'flex-end',
  },
  bgDelete: {
    backgroundColor: theme.colors.danger,
    justifyContent: 'flex-end',
  },
  bgEdit: {
    backgroundColor: '#2196F3',
    justifyContent: 'flex-start',
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
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
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
  dragHandleArea: {
    paddingLeft: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    opacity: 0.5,
  },
}))
