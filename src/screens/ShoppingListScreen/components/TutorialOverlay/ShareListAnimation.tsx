import React, { useEffect } from 'react'
import { View, Text } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import { animStyles } from './animStyles'

export function ShareListAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const headerOpacity = useSharedValue(0)
  const shareIconScale = useSharedValue(0)
  const shareIconOpacity = useSharedValue(0)
  const codeOpacity = useSharedValue(0)
  const codeScale = useSharedValue(0.8)
  const pulseOpacity = useSharedValue(0)
  const timerOpacity = useSharedValue(0)

  useEffect(() => {
    // 1. Show header with list name + share icon
    headerOpacity.value = withDelay(200, withTiming(1, { duration: 400 }))

    // 2. Animate share icon tap
    shareIconOpacity.value = withDelay(400, withTiming(1, { duration: 300 }))
    shareIconScale.value = withDelay(
      800,
      withSequence(
        withTiming(1.3, { duration: 200, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 200 }),
      ),
    )

    // 3. Show sharing code
    codeOpacity.value = withDelay(1200, withTiming(1, { duration: 400 }))
    codeScale.value = withDelay(
      1200,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.3)) }),
    )

    // 4. Pulse effect on code
    pulseOpacity.value = withDelay(
      1800,
      withSequence(
        withTiming(0.3, { duration: 600 }),
        withTiming(0, { duration: 600 }),
        withTiming(0.3, { duration: 600 }),
        withTiming(0, { duration: 600 }),
      ),
    )

    // 5. Show timer
    timerOpacity.value = withDelay(1600, withTiming(1, { duration: 400 }))
  }, [])

  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }))
  const shareIconStyle = useAnimatedStyle(() => ({
    opacity: shareIconOpacity.value,
    transform: [{ scale: shareIconScale.value }],
  }))
  const codeStyle = useAnimatedStyle(() => ({
    opacity: codeOpacity.value,
    transform: [{ scale: codeScale.value }],
  }))
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }))
  const timerStyle = useAnimatedStyle(() => ({ opacity: timerOpacity.value }))

  return (
    <View style={animStyles.scene}>
      <Animated.View style={[animStyles.shareHeader, headerStyle]}>
        <Text style={animStyles.shareListName}>Lidl</Text>
        <Animated.View style={[animStyles.shareIconButton, shareIconStyle]}>
          <Text style={animStyles.shareIconText}>{'\uD83D\uDD17'}</Text>
        </Animated.View>
      </Animated.View>

      <Animated.View style={[animStyles.shareCodeBox, codeStyle]}>
        <Animated.View style={[animStyles.shareCodePulse, pulseStyle]} />
        <Text style={animStyles.shareCodeLabel}>{t('Sharing.codeTitle')}</Text>
        <Text style={animStyles.shareCodeText}>XK7M9P</Text>
      </Animated.View>

      <Animated.View style={timerStyle}>
        <Text style={animStyles.shareTimerText}>14:52</Text>
      </Animated.View>
    </View>
  )
}
