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

export function EditItemAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const itemTranslateX = useSharedValue(0)
  const bgOpacity = useSharedValue(0)
  const zoneFlashOpacity = useSharedValue(0)
  const dialogOpacity = useSharedValue(0)
  const dialogTranslateY = useSharedValue(30)

  useEffect(() => {
    const CYCLE = 5000

    function animate(): void {
      itemTranslateX.value = 0
      bgOpacity.value = 0
      zoneFlashOpacity.value = 0
      dialogOpacity.value = 0
      dialogTranslateY.value = 30

      zoneFlashOpacity.value = withDelay(100, withSequence(
        withTiming(0.6, { duration: 200 }),
        withTiming(0, { duration: 200 }),
        withTiming(0.6, { duration: 200 }),
        withTiming(0, { duration: 200 }),
      ))

      itemTranslateX.value = withDelay(1300, withTiming(100, { duration: 800, easing: Easing.out(Easing.quad) }))
      bgOpacity.value = withDelay(1300, withTiming(1, { duration: 400 }))

      itemTranslateX.value = withDelay(2200, withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }))
      bgOpacity.value = withDelay(2200, withTiming(0, { duration: 300 }))

      dialogOpacity.value = withDelay(2600, withTiming(1, { duration: 300 }))
      dialogTranslateY.value = withDelay(2600, withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.3)) }))
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
  const dialogStyle = useAnimatedStyle(() => ({
    opacity: dialogOpacity.value,
    transform: [{ translateY: dialogTranslateY.value }],
  }))

  return (
    <View style={animStyles.scene}>
      <View style={animStyles.zoneLabel}>
        <Text style={animStyles.zoneLabelTextActive}>{t('Tutorial.leftHalf')}</Text>
        <Text style={animStyles.zoneLabelTextDim} />
      </View>
      <View style={animStyles.swipeDemo}>
        <View style={animStyles.itemWrapper}>
          <Animated.View style={[animStyles.editBg, bgStyle]}>
            <Text style={animStyles.bgText}>{'\u270F\uFE0F'}</Text>
          </Animated.View>
          <Animated.View style={[animStyles.listItem, animStyles.listItemFull, itemStyle]}>
            <Animated.View style={[animStyles.zoneFlashLeft, zoneFlashStyle]} />
            <View style={animStyles.checkbox} />
            <Text style={animStyles.itemName}>{t('Tutorial.exampleItem2')}</Text>
          </Animated.View>
          <SwipeTouchIndicator delay={600} direction="right" style={{ top: 4, left: '20%' }} />
        </View>
      </View>
      <Animated.View style={[animStyles.dialog, { width: '85%' }, dialogStyle]}>
        <Text style={animStyles.dialogTitle}>{t('ShoppingList.editTitle')}</Text>
        <View style={animStyles.editInputField}>
          <Text style={animStyles.editInputText}>{t('Tutorial.exampleItem2')}</Text>
        </View>
        <View style={animStyles.dialogButtons}>
          <Text style={animStyles.dialogCancel}>{t('ShoppingList.cancel')}</Text>
          <Text style={animStyles.dialogConfirm}>{t('ShoppingList.save')}</Text>
        </View>
      </Animated.View>
    </View>
  )
}
