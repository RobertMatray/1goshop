import React, { useEffect } from 'react'
import { View, Text } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import { SwipeTouchIndicator } from './TouchIndicator'
import { animStyles } from './animStyles'

export function DeleteItemAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const itemTranslateX = useSharedValue(0)
  const itemOpacity = useSharedValue(1)
  const bgOpacity = useSharedValue(0)
  const zoneFlashOpacity = useSharedValue(0)

  useEffect(() => {
    const CYCLE = 4000

    function animate(): void {
      itemTranslateX.value = 0
      itemOpacity.value = 1
      bgOpacity.value = 0
      zoneFlashOpacity.value = 0

      zoneFlashOpacity.value = withDelay(100, withSequence(
        withTiming(0.6, { duration: 200 }),
        withTiming(0, { duration: 200 }),
        withTiming(0.6, { duration: 200 }),
        withTiming(0, { duration: 200 }),
      ))

      itemTranslateX.value = withDelay(1300, withTiming(-100, { duration: 800, easing: Easing.out(Easing.quad) }))
      bgOpacity.value = withDelay(1300, withTiming(1, { duration: 400 }))

      itemTranslateX.value = withDelay(2200, withTiming(-350, { duration: 500, easing: Easing.in(Easing.quad) }))
      itemOpacity.value = withDelay(2200, withTiming(0, { duration: 500 }))

      itemTranslateX.value = withDelay(3200, withTiming(0, { duration: 0 }))
      itemOpacity.value = withDelay(3200, withTiming(0, { duration: 0 }))
      itemOpacity.value = withDelay(3300, withTiming(1, { duration: 300 }))
      bgOpacity.value = withDelay(3200, withTiming(0, { duration: 0 }))
    }

    animate()
    const interval = setInterval(animate, CYCLE)
    return () => clearInterval(interval)
  }, [])

  const itemStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: itemTranslateX.value }],
    opacity: itemOpacity.value,
  }))
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }))
  const zoneFlashStyle = useAnimatedStyle(() => ({ opacity: zoneFlashOpacity.value }))

  return (
    <View style={animStyles.scene}>
      <View style={animStyles.zoneLabel}>
        <Text style={animStyles.zoneLabelTextActive}>{t('Tutorial.leftHalf')}</Text>
        <Text style={animStyles.zoneLabelTextDim} />
      </View>
      <View style={animStyles.swipeDemo}>
        <View style={animStyles.itemWrapper}>
          <Animated.View style={[animStyles.deleteBg, bgStyle]}>
            <Text style={animStyles.bgText}>{'\uD83D\uDDD1'}</Text>
          </Animated.View>
          <Animated.View style={[animStyles.listItem, animStyles.listItemFull, itemStyle]}>
            <Animated.View style={[animStyles.zoneFlashLeft, zoneFlashStyle]} />
            <View style={animStyles.checkbox} />
            <Text style={animStyles.itemName}>{t('Tutorial.exampleItem2')}</Text>
          </Animated.View>
          <SwipeTouchIndicator delay={600} direction="left" style={{ top: 4, left: '20%' }} />
        </View>
      </View>
    </View>
  )
}
