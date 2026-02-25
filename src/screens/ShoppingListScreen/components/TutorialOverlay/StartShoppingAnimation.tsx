import React, { useEffect } from 'react'
import { View, Text } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
} from 'react-native-reanimated'
import { TouchIndicator } from './TouchIndicator'
import { animStyles } from './animStyles'

export function StartShoppingAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const check1Opacity = useSharedValue(0)
  const check1BgOpacity = useSharedValue(0)
  const check2Opacity = useSharedValue(0)
  const check2BgOpacity = useSharedValue(0)
  const item1Scale = useSharedValue(1)
  const item2Scale = useSharedValue(1)
  const buttonScale = useSharedValue(1)
  const buttonGlow = useSharedValue(0)

  useEffect(() => {
    // 1. First item taps (700-900ms)
    item1Scale.value = withDelay(700, withSequence(
      withTiming(0.96, { duration: 80 }),
      withTiming(1, { duration: 80 }),
    ))
    check1Opacity.value = withDelay(800, withTiming(1, { duration: 200 }))
    check1BgOpacity.value = withDelay(780, withTiming(1, { duration: 200 }))

    // 2. Second item taps (1400-1600ms)
    item2Scale.value = withDelay(1400, withSequence(
      withTiming(0.96, { duration: 80 }),
      withTiming(1, { duration: 80 }),
    ))
    check2Opacity.value = withDelay(1500, withTiming(1, { duration: 200 }))
    check2BgOpacity.value = withDelay(1480, withTiming(1, { duration: 200 }))

    // 3. Button taps (2300-2500ms)
    buttonScale.value = withDelay(2300, withSequence(
      withTiming(0.94, { duration: 100 }),
      withTiming(1.02, { duration: 150 }),
      withTiming(1, { duration: 100 }),
    ))

    // 4. Button pulses (2600ms+)
    buttonGlow.value = withDelay(2600, withRepeat(
      withSequence(
        withTiming(1, { duration: 500 }),
        withTiming(0, { duration: 500 }),
      ),
      -1,
    ))
  }, [])

  const item1Style = useAnimatedStyle(() => ({
    transform: [{ scale: item1Scale.value }],
  }))
  const item2Style = useAnimatedStyle(() => ({
    transform: [{ scale: item2Scale.value }],
  }))
  const check1Style = useAnimatedStyle(() => ({ opacity: check1Opacity.value }))
  const check1BgStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(76,175,80,${check1BgOpacity.value * 0.2})`,
  }))
  const check2Style = useAnimatedStyle(() => ({ opacity: check2Opacity.value }))
  const check2BgStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(76,175,80,${check2BgOpacity.value * 0.2})`,
  }))
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    opacity: 0.85 + buttonGlow.value * 0.15,
  }))

  return (
    <View style={animStyles.scene}>
      <View style={{ position: 'relative' as const, width: '85%' }}>
        <Animated.View style={[animStyles.listItem, { width: '100%' }, item1Style]}>
          <Animated.View style={[animStyles.checkbox, check1BgStyle]}>
            <Animated.Text style={[animStyles.checkmarkText, check1Style]}>{'\u2713'}</Animated.Text>
          </Animated.View>
          <Text style={animStyles.itemName}>{t('Tutorial.exampleItem1')}</Text>
        </Animated.View>
        <TouchIndicator delay={300} style={{ top: 4, left: 6 }} />
      </View>
      <Animated.View style={[animStyles.listItem, { marginTop: 4 }, item2Style]}>
        <Animated.View style={[animStyles.checkbox, check2BgStyle]}>
          <Animated.Text style={[animStyles.checkmarkText, check2Style]}>{'\u2713'}</Animated.Text>
        </Animated.View>
        <Text style={animStyles.itemName}>{t('Tutorial.exampleItem2')}</Text>
      </Animated.View>
      <View style={{ position: 'relative' as const, width: '85%', alignItems: 'center' as const }}>
        <Animated.View style={[animStyles.startButton, { width: '100%' }, buttonStyle]}>
          <Text style={animStyles.startButtonText}>{t('ActiveShopping.startShopping')}</Text>
        </Animated.View>
        <TouchIndicator delay={2000} style={{ top: 2, right: 20 }} />
      </View>
    </View>
  )
}
