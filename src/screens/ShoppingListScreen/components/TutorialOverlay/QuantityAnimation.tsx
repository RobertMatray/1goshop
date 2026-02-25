import React, { useState, useEffect, useCallback } from 'react'
import { View, Text } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated'
import { SwipeTouchIndicator } from './TouchIndicator'
import { animStyles } from './animStyles'

interface Props {
  t: (key: string) => string
  direction: 'increment' | 'decrement'
}

export function QuantityAnimation({ t, direction }: Props): React.ReactElement {
  const isIncrement = direction === 'increment'
  const swipeDistance = isIncrement ? 100 : -100
  const initialQty = isIncrement ? 1 : 3
  const targetQty = 2
  const bgLabelText = isIncrement ? '+1' : '-1'
  const exampleItemKey = isIncrement ? 'Tutorial.exampleItem3' : 'Tutorial.exampleItem4'

  const itemTranslateX = useSharedValue(0)
  const bgOpacity = useSharedValue(0)
  const zoneFlashOpacity = useSharedValue(0)
  const qtyScale = useSharedValue(1)
  const qtyFlashOpacity = useSharedValue(0)
  const [displayQty, setDisplayQty] = useState(initialQty)

  const setQty = useCallback((val: number) => {
    setDisplayQty(val)
  }, [])

  useEffect(() => {
    const CYCLE = 4000

    function animate(): void {
      itemTranslateX.value = 0
      bgOpacity.value = 0
      zoneFlashOpacity.value = 0
      qtyScale.value = 1
      qtyFlashOpacity.value = 0
      runOnJS(setQty)(initialQty)

      // Phase 1: Right zone flashes (0-600ms)
      zoneFlashOpacity.value = withDelay(100, withSequence(
        withTiming(0.6, { duration: 200 }),
        withTiming(0, { duration: 200 }),
        withTiming(0.6, { duration: 200 }),
        withTiming(0, { duration: 200 }),
      ))

      // Phase 2: Item drags (1300-2100ms)
      itemTranslateX.value = withDelay(1300, withTiming(swipeDistance, { duration: 800, easing: Easing.out(Easing.quad) }))
      bgOpacity.value = withDelay(1300, withTiming(1, { duration: 400 }))

      // Phase 3: Item snaps back (2200-2500ms)
      itemTranslateX.value = withDelay(2200, withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }))
      bgOpacity.value = withDelay(2200, withTiming(0, { duration: 300 }))

      // Phase 4: Qty flashes (2500ms)
      setTimeout(() => runOnJS(setQty)(targetQty), 2500)
      qtyScale.value = withDelay(2500, withSequence(
        withTiming(1.6, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
      ))
      qtyFlashOpacity.value = withDelay(2500, withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 400 }),
      ))
    }

    animate()
    const interval = setInterval(animate, CYCLE)
    return () => clearInterval(interval)
  }, [])

  const itemStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: itemTranslateX.value }],
  }))
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }))
  const zoneFlashStyle = useAnimatedStyle(() => ({ opacity: zoneFlashOpacity.value }))
  const qtyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: qtyScale.value }],
  }))
  const qtyFlashStyle = useAnimatedStyle(() => ({
    opacity: qtyFlashOpacity.value,
  }))

  const bgViewStyle = isIncrement ? animStyles.plusBg : animStyles.minusBg
  const flashColorStyle = isIncrement ? animStyles.qtyFlashGreen : animStyles.qtyFlashOrange
  const swipeTouchDirection = isIncrement ? 'right' : 'left'

  return (
    <View style={animStyles.scene}>
      <View style={animStyles.zoneLabel}>
        <Text style={animStyles.zoneLabelTextDim} />
        <Text style={animStyles.zoneLabelTextActive}>{t('Tutorial.rightHalf')}</Text>
      </View>
      <View style={animStyles.swipeDemo}>
        <View style={animStyles.itemWrapper}>
          <Animated.View style={[bgViewStyle, bgStyle]}>
            <Text style={animStyles.bgText}>{bgLabelText}</Text>
          </Animated.View>
          <Animated.View style={[animStyles.listItem, animStyles.listItemFull, itemStyle]}>
            <Animated.View style={[animStyles.zoneFlashRight, zoneFlashStyle]} />
            <View style={animStyles.checkbox} />
            <Text style={animStyles.itemName}>{t(exampleItemKey)}</Text>
            <Animated.View style={[animStyles.qtyBadge, qtyStyle]}>
              <Animated.View style={[animStyles.qtyFlash, flashColorStyle, qtyFlashStyle]} />
              <Text style={animStyles.qtyText}>x{displayQty}</Text>
            </Animated.View>
          </Animated.View>
          <SwipeTouchIndicator delay={600} direction={swipeTouchDirection} style={{ top: 4, right: '20%' }} />
        </View>
      </View>
    </View>
  )
}
