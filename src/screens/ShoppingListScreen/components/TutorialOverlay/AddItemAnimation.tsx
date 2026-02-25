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

export function AddItemAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const inputOpacity = useSharedValue(0)
  const textWidth = useSharedValue(0)
  const buttonScale = useSharedValue(1)
  const itemOpacity = useSharedValue(0)
  const itemTranslateY = useSharedValue(-20)

  useEffect(() => {
    inputOpacity.value = withDelay(200, withTiming(1, { duration: 400 }))
    textWidth.value = withDelay(600, withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) }))
    buttonScale.value = withDelay(1500, withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(1, { duration: 100 }),
    ))
    itemOpacity.value = withDelay(1800, withTiming(1, { duration: 400 }))
    itemTranslateY.value = withDelay(1800, withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.5)) }))
  }, [])

  const inputStyle = useAnimatedStyle(() => ({ opacity: inputOpacity.value }))
  const textStyle = useAnimatedStyle(() => ({ opacity: textWidth.value }))
  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }))
  const itemStyle = useAnimatedStyle(() => ({
    opacity: itemOpacity.value,
    transform: [{ translateY: itemTranslateY.value }],
  }))

  return (
    <View style={animStyles.scene}>
      <Animated.View style={[animStyles.inputRow, inputStyle]}>
        <View style={animStyles.inputField}>
          <Animated.Text style={[animStyles.inputText, textStyle]}>{t('Tutorial.exampleItem1')}</Animated.Text>
        </View>
        <View style={{ position: 'relative' as const }}>
          <Animated.View style={[animStyles.addButton, buttonStyle]}>
            <Text style={animStyles.addButtonText}>+</Text>
          </Animated.View>
          <TouchIndicator delay={1200} style={{ top: 0, left: 0 }} />
        </View>
      </Animated.View>
      <Animated.View style={[animStyles.listItem, itemStyle]}>
        <View style={animStyles.checkbox} />
        <Text style={animStyles.itemName}>{t('Tutorial.exampleItem1')}</Text>
      </Animated.View>
    </View>
  )
}
