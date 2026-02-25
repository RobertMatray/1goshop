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

export function FinishShoppingAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const buttonScale = useSharedValue(1)
  const dialogOpacity = useSharedValue(0)
  const dialogTranslateY = useSharedValue(40)
  const confirmHighlight = useSharedValue(0)

  useEffect(() => {
    // 1. Button taps (700-900ms)
    buttonScale.value = withDelay(700, withSequence(
      withTiming(0.94, { duration: 100 }),
      withTiming(1, { duration: 150 }),
    ))

    // 2. Dialog appears (1000-1400ms)
    dialogOpacity.value = withDelay(1000, withTiming(1, { duration: 300 }))
    dialogTranslateY.value = withDelay(1000, withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.3)) }))

    // 3. Confirm highlights (2100-2300ms)
    confirmHighlight.value = withDelay(2100, withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0.6, { duration: 300 }),
    ))
  }, [])

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }))
  const dialogStyle = useAnimatedStyle(() => ({
    opacity: dialogOpacity.value,
    transform: [{ translateY: dialogTranslateY.value }],
  }))
  const confirmStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + confirmHighlight.value * 0.3,
    transform: [{ scale: 1 + confirmHighlight.value * 0.15 }],
  }))

  return (
    <View style={animStyles.scene}>
      <View style={animStyles.statusRow}>
        <Text style={animStyles.statusText}>3 / 3 {'\u2713'}</Text>
      </View>
      <View style={{ position: 'relative' as const, width: '85%', alignItems: 'center' as const }}>
        <Animated.View style={[animStyles.finishButton, { width: '100%' }, buttonStyle]}>
          <Text style={animStyles.finishButtonText}>{t('ActiveShopping.finishShopping')}</Text>
        </Animated.View>
        <TouchIndicator delay={300} style={{ top: 4, right: 20 }} />
      </View>
      <Animated.View style={[animStyles.dialog, dialogStyle]}>
        <Text style={animStyles.dialogTitle}>{t('ActiveShopping.finishTitle')}</Text>
        <Text style={animStyles.dialogMessage}>{t('ActiveShopping.finishMessage')}</Text>
        <View style={animStyles.dialogButtons}>
          <Text style={animStyles.dialogCancel}>{t('ActiveShopping.cancel')}</Text>
          <Animated.Text style={[animStyles.dialogConfirm, confirmStyle]}>{t('ActiveShopping.finish')}</Animated.Text>
        </View>
      </Animated.View>
    </View>
  )
}
