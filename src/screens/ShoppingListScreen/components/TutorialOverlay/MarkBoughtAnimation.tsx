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
import { TouchIndicator } from './TouchIndicator'
import { animStyles } from './animStyles'

export function MarkBoughtAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const tapScale = useSharedValue(1)
  const checkOpacity = useSharedValue(0)
  const circleFill = useSharedValue(0)
  const nameOpacity = useSharedValue(1)

  useEffect(() => {
    const CYCLE = 2800

    function animate(): void {
      tapScale.value = 1
      checkOpacity.value = 0
      circleFill.value = 0
      nameOpacity.value = 1

      // 1. Item taps (600-800ms)
      tapScale.value = withDelay(600, withSequence(
        withTiming(0.96, { duration: 80 }),
        withTiming(1, { duration: 120 }),
      ))

      // 2. Check fills (750-1000ms)
      circleFill.value = withDelay(750, withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) }))
      checkOpacity.value = withDelay(850, withTiming(1, { duration: 200 }))

      // 3. Name dims (900ms)
      nameOpacity.value = withDelay(900, withTiming(0.4, { duration: 200 }))
    }

    animate()
    const interval = setInterval(animate, CYCLE)
    return () => clearInterval(interval)
  }, [])

  const itemStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tapScale.value }],
  }))
  const checkStyle = useAnimatedStyle(() => ({ opacity: checkOpacity.value }))
  const circleStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(76,175,80,${circleFill.value * 0.3})`,
    borderColor: `rgba(76,175,80,${0.6 + circleFill.value * 0.4})`,
  }))
  const nameStyle = useAnimatedStyle(() => ({
    opacity: nameOpacity.value,
  }))

  return (
    <View style={animStyles.scene}>
      <View style={{ position: 'relative' as const, width: '85%' }}>
        <Animated.View style={[animStyles.shoppingItem, { width: '100%' }, itemStyle]}>
          <Animated.View style={[animStyles.boughtCircle, circleStyle]}>
            <Animated.Text style={[animStyles.boughtCheck, checkStyle]}>{'\u2713'}</Animated.Text>
          </Animated.View>
          <Animated.Text style={[animStyles.itemName, nameStyle]}>{t('Tutorial.exampleItem1')}</Animated.Text>
          <View style={animStyles.qtyBadge}>
            <Text style={animStyles.qtyText}>x2</Text>
          </View>
        </Animated.View>
        <TouchIndicator delay={200} style={{ top: 4, left: 6 }} />
      </View>
    </View>
  )
}
