import React, { useEffect } from 'react'
import { Animated as RNAnimated } from 'react-native'

// ============================================================
// Touch indicator - pulsing circle using RN core Animated (NOT reanimated)
// Guaranteed to render on iOS production builds
// ============================================================
export function TouchIndicator({ delay = 0, style }: { delay?: number; style?: object }): React.ReactElement {
  const scale = React.useRef(new RNAnimated.Value(1)).current
  const opacity = React.useRef(new RNAnimated.Value(0)).current

  useEffect(() => {
    const timeout = setTimeout(() => {
      RNAnimated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()

      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(scale, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          RNAnimated.timing(scale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start()
    }, delay)

    return () => clearTimeout(timeout)
  }, [delay, opacity, scale])

  return (
    <RNAnimated.View
      style={[
        {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(255,255,255,0.25)',
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.5)',
          position: 'absolute' as const,
          transform: [{ scale }],
          opacity,
        },
        style,
      ]}
    />
  )
}

// ============================================================
// Swipe touch indicator - slides in the swipe direction, then resets
// direction: 'left' or 'right'
// ============================================================
export function SwipeTouchIndicator({ delay = 0, direction, style }: { delay?: number; direction: 'left' | 'right'; style?: object }): React.ReactElement {
  const translateX = React.useRef(new RNAnimated.Value(0)).current
  const opacity = React.useRef(new RNAnimated.Value(0)).current
  const scale = React.useRef(new RNAnimated.Value(1)).current
  const slideDistance = direction === 'left' ? -80 : 80

  useEffect(() => {
    const timeout = setTimeout(() => {
      // Fade in
      RNAnimated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()

      // Looping: pulse once, then slide, then reset
      RNAnimated.loop(
        RNAnimated.sequence([
          // Pulse in place
          RNAnimated.timing(scale, {
            toValue: 1.2,
            duration: 400,
            useNativeDriver: true,
          }),
          RNAnimated.timing(scale, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          // Slide in swipe direction
          RNAnimated.timing(translateX, {
            toValue: slideDistance,
            duration: 800,
            useNativeDriver: true,
          }),
          // Fade out briefly
          RNAnimated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          // Reset position while invisible
          RNAnimated.timing(translateX, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
          // Pause
          RNAnimated.delay(400),
          // Fade back in
          RNAnimated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ).start()
    }, delay)

    return () => clearTimeout(timeout)
  }, [delay, opacity, scale, translateX, slideDistance])

  return (
    <RNAnimated.View
      style={[
        {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(255,255,255,0.25)',
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.5)',
          position: 'absolute' as const,
          transform: [{ translateX }, { scale }],
          opacity,
        },
        style,
      ]}
    />
  )
}
