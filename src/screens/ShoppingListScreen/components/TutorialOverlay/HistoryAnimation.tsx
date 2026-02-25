import React, { useEffect } from 'react'
import { View, Text } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated'
import { animStyles } from './animStyles'

export function HistoryAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const card1Y = useSharedValue(30)
  const card1Opacity = useSharedValue(0)
  const card2Y = useSharedValue(30)
  const card2Opacity = useSharedValue(0)
  const statsOpacity = useSharedValue(0)

  useEffect(() => {
    statsOpacity.value = withDelay(200, withTiming(1, { duration: 400 }))
    card1Opacity.value = withDelay(600, withTiming(1, { duration: 400 }))
    card1Y.value = withDelay(600, withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.3)) }))
    card2Opacity.value = withDelay(900, withTiming(1, { duration: 400 }))
    card2Y.value = withDelay(900, withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.3)) }))
  }, [])

  const statsStyle = useAnimatedStyle(() => ({ opacity: statsOpacity.value }))
  const card1Style = useAnimatedStyle(() => ({
    opacity: card1Opacity.value,
    transform: [{ translateY: card1Y.value }],
  }))
  const card2Style = useAnimatedStyle(() => ({
    opacity: card2Opacity.value,
    transform: [{ translateY: card2Y.value }],
  }))

  return (
    <View style={animStyles.scene}>
      <Animated.View style={[animStyles.statsRow, statsStyle]}>
        <View style={animStyles.statBox}>
          <Text style={animStyles.statNumber}>5</Text>
          <Text style={animStyles.statLabel}>{t('History.totalSessions')}</Text>
        </View>
        <View style={animStyles.statBox}>
          <Text style={animStyles.statNumber}>23</Text>
          <Text style={animStyles.statLabel}>{t('History.totalItems')}</Text>
        </View>
        <View style={animStyles.statBox}>
          <Text style={animStyles.statNumber}>21</Text>
          <Text style={animStyles.statLabel}>{t('History.totalBought')}</Text>
        </View>
      </Animated.View>
      <Animated.View style={[animStyles.historyCard, card1Style]}>
        <Text style={animStyles.historyDate}>15.2.2026</Text>
        <Text style={animStyles.historyInfo}>5 / 5 {'\u2713'}</Text>
      </Animated.View>
      <Animated.View style={[animStyles.historyCard, card2Style]}>
        <Text style={animStyles.historyDate}>14.2.2026</Text>
        <Text style={animStyles.historyInfo}>4 / 5 {'\u2713'}</Text>
      </Animated.View>
    </View>
  )
}
