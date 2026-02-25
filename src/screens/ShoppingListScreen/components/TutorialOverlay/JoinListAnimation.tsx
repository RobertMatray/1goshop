import React, { useEffect } from 'react'
import { View, Text } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  type SharedValue,
} from 'react-native-reanimated'
import { animStyles } from './animStyles'

export function JoinListAnimation({ t }: { t: (key: string, opts?: Record<string, string>) => string }): React.ReactElement {
  const inputOpacity = useSharedValue(0)
  const char1 = useSharedValue(0)
  const char2 = useSharedValue(0)
  const char3 = useSharedValue(0)
  const char4 = useSharedValue(0)
  const char5 = useSharedValue(0)
  const char6 = useSharedValue(0)
  const buttonOpacity = useSharedValue(0)
  const buttonScale = useSharedValue(1)
  const successOpacity = useSharedValue(0)
  const successScale = useSharedValue(0.5)

  useEffect(() => {
    // 1. Show input field
    inputOpacity.value = withDelay(200, withTiming(1, { duration: 400 }))

    // 2. Type characters one by one
    char1.value = withDelay(600, withTiming(1, { duration: 100 }))
    char2.value = withDelay(750, withTiming(1, { duration: 100 }))
    char3.value = withDelay(900, withTiming(1, { duration: 100 }))
    char4.value = withDelay(1050, withTiming(1, { duration: 100 }))
    char5.value = withDelay(1200, withTiming(1, { duration: 100 }))
    char6.value = withDelay(1350, withTiming(1, { duration: 100 }))

    // 3. Show join button
    buttonOpacity.value = withDelay(1500, withTiming(1, { duration: 300 }))

    // 4. Animate button tap
    buttonScale.value = withDelay(
      1900,
      withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1, { duration: 100 }),
      ),
    )

    // 5. Show success
    successOpacity.value = withDelay(2200, withTiming(1, { duration: 400 }))
    successScale.value = withDelay(
      2200,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.5)) }),
    )
  }, [])

  const inputStyle = useAnimatedStyle(() => ({ opacity: inputOpacity.value }))
  const charStyle = (val: SharedValue<number>) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => ({ opacity: val.value }))
  const c1 = charStyle(char1)
  const c2 = charStyle(char2)
  const c3 = charStyle(char3)
  const c4 = charStyle(char4)
  const c5 = charStyle(char5)
  const c6 = charStyle(char6)
  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }))
  const successStyle = useAnimatedStyle(() => ({
    opacity: successOpacity.value,
    transform: [{ scale: successScale.value }],
  }))

  return (
    <View style={animStyles.scene}>
      <Animated.View style={[animStyles.joinInputBox, inputStyle]}>
        <Text style={animStyles.joinInputLabel}>{t('Sharing.joinPlaceholder')}</Text>
        <View style={animStyles.joinCodeChars}>
          <Animated.Text style={[animStyles.joinCodeChar, c1]}>X</Animated.Text>
          <Animated.Text style={[animStyles.joinCodeChar, c2]}>K</Animated.Text>
          <Animated.Text style={[animStyles.joinCodeChar, c3]}>7</Animated.Text>
          <Animated.Text style={[animStyles.joinCodeChar, c4]}>M</Animated.Text>
          <Animated.Text style={[animStyles.joinCodeChar, c5]}>9</Animated.Text>
          <Animated.Text style={[animStyles.joinCodeChar, c6]}>P</Animated.Text>
        </View>
      </Animated.View>

      <Animated.View style={[animStyles.joinButton, buttonStyle]}>
        <Text style={animStyles.joinButtonText}>{t('Sharing.joinButton')}</Text>
      </Animated.View>

      <Animated.View style={[animStyles.joinSuccess, successStyle]}>
        <Text style={animStyles.joinSuccessIcon}>{'\u2713'}</Text>
        <Text style={animStyles.joinSuccessText}>{t('Sharing.joinSuccess', { name: 'Lidl' })}</Text>
      </Animated.View>
    </View>
  )
}
