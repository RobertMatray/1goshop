import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, Pressable, Modal, useWindowDimensions } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
} from 'react-native-reanimated'
import { StyleSheet } from 'react-native-unistyles'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

interface Props {
  visible: boolean
  onClose: () => void
}

const TOTAL_STEPS = 8

export function TutorialOverlay({ visible, onClose }: Props): React.ReactElement | null {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { width: screenWidth } = useWindowDimensions()
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (visible) setStep(0)
  }, [visible])

  if (!visible) return null

  const stepTitles = [
    t('Tutorial.step1Title'),
    t('Tutorial.step2Title'),
    t('Tutorial.step3Title'),
    t('Tutorial.step4Title'),
    t('Tutorial.step5Title'),
    t('Tutorial.step6Title'),
    t('Tutorial.step7Title'),
    t('Tutorial.step8Title'),
  ]

  const stepDescriptions = [
    t('Tutorial.step1Desc'),
    t('Tutorial.step2Desc'),
    t('Tutorial.step3Desc'),
    t('Tutorial.step4Desc'),
    t('Tutorial.step5Desc'),
    t('Tutorial.step6Desc'),
    t('Tutorial.step7Desc'),
    t('Tutorial.step8Desc'),
  ]

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <Text style={styles.stepIndicator}>
              {step + 1} / {TOTAL_STEPS}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.closeButton}>{'\u2715'}</Text>
            </Pressable>
          </View>

          <View style={styles.content}>
            <Animated.View
              key={step}
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(150)}
              style={styles.stepContent}
            >
              <View style={styles.animationArea}>
                <StepAnimation step={step} screenWidth={screenWidth} t={t} />
              </View>

              <Text style={styles.stepTitle}>{stepTitles[step]}</Text>
              <Text style={styles.stepDescription}>{stepDescriptions[step]}</Text>
            </Animated.View>
          </View>

          <View style={styles.progressBar}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[styles.progressDot, i === step && styles.progressDotActive, i < step && styles.progressDotDone]}
              />
            ))}
          </View>

          <View style={styles.navigation}>
            {step > 0 ? (
              <Pressable style={styles.navButton} onPress={() => setStep(step - 1)}>
                <Text style={styles.navButtonText}>{'\u2039'} {t('Tutorial.prev')}</Text>
              </Pressable>
            ) : (
              <View style={styles.navButton} />
            )}

            {step < TOTAL_STEPS - 1 ? (
              <Pressable style={[styles.navButton, styles.navButtonPrimary]} onPress={() => setStep(step + 1)}>
                <Text style={styles.navButtonPrimaryText}>{t('Tutorial.next')} {'\u203A'}</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.navButton, styles.navButtonPrimary]} onPress={onClose}>
                <Text style={styles.navButtonPrimaryText}>{t('Tutorial.done')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

function StepAnimation({ step, screenWidth, t }: { step: number; screenWidth: number; t: (key: string) => string }): React.ReactElement {
  switch (step) {
    case 0:
      return <AddItemAnimation t={t} />
    case 1:
      return <DeleteItemAnimation t={t} />
    case 2:
      return <IncrementAnimation t={t} />
    case 3:
      return <DecrementAnimation t={t} />
    case 4:
      return <StartShoppingAnimation t={t} />
    case 5:
      return <MarkBoughtAnimation t={t} />
    case 6:
      return <FinishShoppingAnimation t={t} />
    case 7:
      return <HistoryAnimation t={t} />
    default:
      return <View />
  }
}

// ============================================================
// Finger pointer - pure View, no emoji/Unicode (invisible on iOS)
// ============================================================
function FingerPointer(): React.ReactElement {
  return (
    <View style={fingerPointerStyles.container}>
      {/* Finger tip circle */}
      <View style={fingerPointerStyles.tip} />
      {/* Finger stem */}
      <View style={fingerPointerStyles.stem} />
    </View>
  )
}

const fingerPointerStyles = StyleSheet.create(() => ({
  container: {
    alignItems: 'center',
    width: 28,
    height: 44,
  },
  tip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  stem: {
    width: 10,
    height: 22,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    marginTop: -2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
}))

// ============================================================
// Step 1: Add item animation (no finger)
// ============================================================
function AddItemAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
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
        <Animated.View style={[animStyles.addButton, buttonStyle]}>
          <Text style={animStyles.addButtonText}>+</Text>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[animStyles.listItem, itemStyle]}>
        <View style={animStyles.checkbox} />
        <Text style={animStyles.itemName}>{t('Tutorial.exampleItem1')}</Text>
      </Animated.View>
    </View>
  )
}

// ============================================================
// Step 2: Delete item - LEFT half swipe left
// Sequence: left zone flashes -> finger appears -> drags left -> delete bg reveals -> item gone
// ============================================================
function DeleteItemAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const itemTranslateX = useSharedValue(0)
  const itemOpacity = useSharedValue(1)
  const bgOpacity = useSharedValue(0)
  const zoneFlashOpacity = useSharedValue(0)
  // Finger: rendered in normal flow below item, moved with translateX/Y
  const fingerOpacity = useSharedValue(0)
  const fingerTX = useSharedValue(0)
  const fingerTY = useSharedValue(0)
  const fingerScale = useSharedValue(1)

  useEffect(() => {
    const CYCLE = 4000

    function animate(): void {
      // Reset all
      itemTranslateX.value = 0
      itemOpacity.value = 1
      bgOpacity.value = 0
      zoneFlashOpacity.value = 0
      fingerOpacity.value = 0
      fingerTX.value = -40
      fingerTY.value = -20
      fingerScale.value = 1

      // Phase 1: Left zone flashes (0-600ms)
      zoneFlashOpacity.value = withDelay(100, withSequence(
        withTiming(0.6, { duration: 200 }),
        withTiming(0, { duration: 200 }),
        withTiming(0.6, { duration: 200 }),
        withTiming(0, { duration: 200 }),
      ))

      // Phase 2: Finger appears and moves up to item (600-1100ms)
      fingerOpacity.value = withDelay(600, withTiming(1, { duration: 200 }))
      fingerTY.value = withDelay(600, withTiming(-50, { duration: 400, easing: Easing.out(Easing.quad) }))

      // Phase 3: Finger presses (1100ms)
      fingerScale.value = withDelay(1100, withSequence(
        withTiming(0.8, { duration: 100 }),
        withTiming(0.85, { duration: 100 }),
      ))

      // Phase 4: Finger drags item left (1300-2100ms)
      fingerTX.value = withDelay(1300, withTiming(-120, { duration: 800, easing: Easing.out(Easing.quad) }))
      itemTranslateX.value = withDelay(1300, withTiming(-100, { duration: 800, easing: Easing.out(Easing.quad) }))
      bgOpacity.value = withDelay(1300, withTiming(1, { duration: 400 }))

      // Phase 5: Item slides off, finger fades (2200-2700ms)
      itemTranslateX.value = withDelay(2200, withTiming(-350, { duration: 500, easing: Easing.in(Easing.quad) }))
      itemOpacity.value = withDelay(2200, withTiming(0, { duration: 500 }))
      fingerOpacity.value = withDelay(2200, withTiming(0, { duration: 300 }))

      // Phase 6: Reset visible (3200ms)
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
  const fingerStyle = useAnimatedStyle(() => ({
    opacity: fingerOpacity.value,
    transform: [
      { translateX: fingerTX.value },
      { translateY: fingerTY.value },
      { scale: fingerScale.value },
    ],
  }))

  return (
    <View style={animStyles.scene}>
      <View style={animStyles.zoneLabel}>
        <Text style={animStyles.zoneLabelTextActive}>LEFT half</Text>
        <Text style={animStyles.zoneLabelTextDim} />
      </View>
      <View style={animStyles.swipeDemo}>
        <View style={animStyles.itemWrapper}>
          <Animated.View style={[animStyles.deleteBg, bgStyle]}>
            <Text style={animStyles.bgText}>{'\uD83D\uDDD1'}</Text>
          </Animated.View>
          <Animated.View style={[animStyles.listItem, animStyles.listItemFull, itemStyle]}>
            {/* Left zone flash overlay */}
            <Animated.View style={[animStyles.zoneFlashLeft, zoneFlashStyle]} />
            <View style={animStyles.checkbox} />
            <Text style={animStyles.itemName}>{t('Tutorial.exampleItem2')}</Text>
          </Animated.View>
        </View>
      </View>
      {/* Finger - absolute positioned to avoid clipping */}
      <Animated.View style={[animStyles.fingerAbsolute, fingerStyle]}>
        <FingerPointer />
      </Animated.View>
    </View>
  )
}

// ============================================================
// Step 3: Increment (+1) - RIGHT half swipe right
// Sequence: right zone flashes -> finger appears -> drags right -> +1 bg reveals -> qty x1->x2
// ============================================================
function IncrementAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const itemTranslateX = useSharedValue(0)
  const bgOpacity = useSharedValue(0)
  const zoneFlashOpacity = useSharedValue(0)
  const fingerOpacity = useSharedValue(0)
  const fingerTX = useSharedValue(40)
  const fingerTY = useSharedValue(0)
  const fingerScale = useSharedValue(1)
  const qtyScale = useSharedValue(1)
  const qtyFlashOpacity = useSharedValue(0)
  const [displayQty, setDisplayQty] = useState(1)

  const setQty = useCallback((val: number) => {
    setDisplayQty(val)
  }, [])

  useEffect(() => {
    const CYCLE = 4000

    function animate(): void {
      // Reset
      itemTranslateX.value = 0
      bgOpacity.value = 0
      zoneFlashOpacity.value = 0
      fingerOpacity.value = 0
      fingerTX.value = 40
      fingerTY.value = 0
      fingerScale.value = 1
      qtyScale.value = 1
      qtyFlashOpacity.value = 0
      runOnJS(setQty)(1)

      // Phase 1: Right zone flashes (0-600ms)
      zoneFlashOpacity.value = withDelay(100, withSequence(
        withTiming(0.6, { duration: 200 }),
        withTiming(0, { duration: 200 }),
        withTiming(0.6, { duration: 200 }),
        withTiming(0, { duration: 200 }),
      ))

      // Phase 2: Finger appears and moves up to item (600-1100ms)
      fingerOpacity.value = withDelay(600, withTiming(1, { duration: 200 }))
      fingerTY.value = withDelay(600, withTiming(-50, { duration: 400, easing: Easing.out(Easing.quad) }))

      // Phase 3: Finger presses (1100ms)
      fingerScale.value = withDelay(1100, withSequence(
        withTiming(0.8, { duration: 100 }),
        withTiming(0.85, { duration: 100 }),
      ))

      // Phase 4: Finger drags item right (1300-2100ms)
      fingerTX.value = withDelay(1300, withTiming(120, { duration: 800, easing: Easing.out(Easing.quad) }))
      itemTranslateX.value = withDelay(1300, withTiming(100, { duration: 800, easing: Easing.out(Easing.quad) }))
      bgOpacity.value = withDelay(1300, withTiming(1, { duration: 400 }))

      // Phase 5: Item snaps back, finger fades (2200-2500ms)
      itemTranslateX.value = withDelay(2200, withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }))
      bgOpacity.value = withDelay(2200, withTiming(0, { duration: 300 }))
      fingerOpacity.value = withDelay(2200, withTiming(0, { duration: 200 }))

      // Phase 6: Qty flashes x1 -> x2 (2500ms)
      setTimeout(() => runOnJS(setQty)(2), 2500)
      qtyScale.value = withDelay(2500, withSequence(
        withTiming(1.6, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
      ))
      qtyFlashOpacity.value = withDelay(2500, withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 400 }),
      ))
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
  const fingerStyle = useAnimatedStyle(() => ({
    opacity: fingerOpacity.value,
    transform: [
      { translateX: fingerTX.value },
      { translateY: fingerTY.value },
      { scale: fingerScale.value },
    ],
  }))
  const qtyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: qtyScale.value }],
  }))
  const qtyFlashStyle = useAnimatedStyle(() => ({
    opacity: qtyFlashOpacity.value,
  }))

  return (
    <View style={animStyles.scene}>
      <View style={animStyles.zoneLabel}>
        <Text style={animStyles.zoneLabelTextDim} />
        <Text style={animStyles.zoneLabelTextActive}>RIGHT half</Text>
      </View>
      <View style={animStyles.swipeDemo}>
        <View style={animStyles.itemWrapper}>
          <Animated.View style={[animStyles.plusBg, bgStyle]}>
            <Text style={animStyles.bgText}>+1</Text>
          </Animated.View>
          <Animated.View style={[animStyles.listItem, animStyles.listItemFull, itemStyle]}>
            {/* Right zone flash overlay */}
            <Animated.View style={[animStyles.zoneFlashRight, zoneFlashStyle]} />
            <View style={animStyles.checkbox} />
            <Text style={animStyles.itemName}>{t('Tutorial.exampleItem3')}</Text>
            <Animated.View style={[animStyles.qtyBadge, qtyStyle]}>
              <Animated.View style={[animStyles.qtyFlash, animStyles.qtyFlashGreen, qtyFlashStyle]} />
              <Text style={animStyles.qtyText}>x{displayQty}</Text>
            </Animated.View>
          </Animated.View>
        </View>
      </View>
      {/* Finger - absolute positioned to avoid clipping */}
      <Animated.View style={[animStyles.fingerAbsolute, fingerStyle]}>
        <FingerPointer />
      </Animated.View>
    </View>
  )
}

// ============================================================
// Step 4: Decrement (-1) - RIGHT half swipe left
// Sequence: right zone flashes -> finger appears -> drags left -> -1 bg reveals -> qty x3->x2
// ============================================================
function DecrementAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const itemTranslateX = useSharedValue(0)
  const bgOpacity = useSharedValue(0)
  const zoneFlashOpacity = useSharedValue(0)
  const fingerOpacity = useSharedValue(0)
  const fingerTX = useSharedValue(40)
  const fingerTY = useSharedValue(0)
  const fingerScale = useSharedValue(1)
  const qtyScale = useSharedValue(1)
  const qtyFlashOpacity = useSharedValue(0)
  const [displayQty, setDisplayQty] = useState(3)

  const setQty = useCallback((val: number) => {
    setDisplayQty(val)
  }, [])

  useEffect(() => {
    const CYCLE = 4000

    function animate(): void {
      // Reset
      itemTranslateX.value = 0
      bgOpacity.value = 0
      zoneFlashOpacity.value = 0
      fingerOpacity.value = 0
      fingerTX.value = 40
      fingerTY.value = 0
      fingerScale.value = 1
      qtyScale.value = 1
      qtyFlashOpacity.value = 0
      runOnJS(setQty)(3)

      // Phase 1: Right zone flashes (0-600ms)
      zoneFlashOpacity.value = withDelay(100, withSequence(
        withTiming(0.6, { duration: 200 }),
        withTiming(0, { duration: 200 }),
        withTiming(0.6, { duration: 200 }),
        withTiming(0, { duration: 200 }),
      ))

      // Phase 2: Finger appears and moves up to item (600-1100ms)
      fingerOpacity.value = withDelay(600, withTiming(1, { duration: 200 }))
      fingerTY.value = withDelay(600, withTiming(-50, { duration: 400, easing: Easing.out(Easing.quad) }))

      // Phase 3: Finger presses (1100ms)
      fingerScale.value = withDelay(1100, withSequence(
        withTiming(0.8, { duration: 100 }),
        withTiming(0.85, { duration: 100 }),
      ))

      // Phase 4: Finger drags item left (1300-2100ms)
      fingerTX.value = withDelay(1300, withTiming(-40, { duration: 800, easing: Easing.out(Easing.quad) }))
      itemTranslateX.value = withDelay(1300, withTiming(-100, { duration: 800, easing: Easing.out(Easing.quad) }))
      bgOpacity.value = withDelay(1300, withTiming(1, { duration: 400 }))

      // Phase 5: Item snaps back, finger fades (2200-2500ms)
      itemTranslateX.value = withDelay(2200, withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }))
      bgOpacity.value = withDelay(2200, withTiming(0, { duration: 300 }))
      fingerOpacity.value = withDelay(2200, withTiming(0, { duration: 200 }))

      // Phase 6: Qty flashes x3 -> x2 (2500ms)
      setTimeout(() => runOnJS(setQty)(2), 2500)
      qtyScale.value = withDelay(2500, withSequence(
        withTiming(1.6, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
      ))
      qtyFlashOpacity.value = withDelay(2500, withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 400 }),
      ))
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
  const fingerStyle = useAnimatedStyle(() => ({
    opacity: fingerOpacity.value,
    transform: [
      { translateX: fingerTX.value },
      { translateY: fingerTY.value },
      { scale: fingerScale.value },
    ],
  }))
  const qtyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: qtyScale.value }],
  }))
  const qtyFlashStyle = useAnimatedStyle(() => ({
    opacity: qtyFlashOpacity.value,
  }))

  return (
    <View style={animStyles.scene}>
      <View style={animStyles.zoneLabel}>
        <Text style={animStyles.zoneLabelTextDim} />
        <Text style={animStyles.zoneLabelTextActive}>RIGHT half</Text>
      </View>
      <View style={animStyles.swipeDemo}>
        <View style={animStyles.itemWrapper}>
          <Animated.View style={[animStyles.minusBg, bgStyle]}>
            <Text style={animStyles.bgText}>-1</Text>
          </Animated.View>
          <Animated.View style={[animStyles.listItem, animStyles.listItemFull, itemStyle]}>
            {/* Right zone flash overlay */}
            <Animated.View style={[animStyles.zoneFlashRight, zoneFlashStyle]} />
            <View style={animStyles.checkbox} />
            <Text style={animStyles.itemName}>{t('Tutorial.exampleItem4')}</Text>
            <Animated.View style={[animStyles.qtyBadge, qtyStyle]}>
              <Animated.View style={[animStyles.qtyFlash, animStyles.qtyFlashOrange, qtyFlashStyle]} />
              <Text style={animStyles.qtyText}>x{displayQty}</Text>
            </Animated.View>
          </Animated.View>
        </View>
      </View>
      {/* Finger - absolute positioned to avoid clipping */}
      <Animated.View style={[animStyles.fingerAbsolute, fingerStyle]}>
        <FingerPointer />
      </Animated.View>
    </View>
  )
}

// ============================================================
// Step 5: Start shopping - finger taps checkboxes then taps button
// ============================================================
function StartShoppingAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const fingerOpacity = useSharedValue(0)
  const fingerTX = useSharedValue(0)
  const fingerTY = useSharedValue(0)
  const fingerScale = useSharedValue(1)
  const check1Opacity = useSharedValue(0)
  const check1BgOpacity = useSharedValue(0)
  const check2Opacity = useSharedValue(0)
  const check2BgOpacity = useSharedValue(0)
  const item1Scale = useSharedValue(1)
  const item2Scale = useSharedValue(1)
  const buttonScale = useSharedValue(1)
  const buttonGlow = useSharedValue(0)

  useEffect(() => {
    // Sequential animation (plays once)

    // 1. Finger appears below items (200ms)
    fingerOpacity.value = withDelay(200, withTiming(1, { duration: 200 }))

    // 2. Finger moves up to first checkbox (300-700ms)
    fingerTX.value = withDelay(300, withTiming(-60, { duration: 400, easing: Easing.inOut(Easing.quad) }))
    fingerTY.value = withDelay(300, withTiming(-130, { duration: 400, easing: Easing.inOut(Easing.quad) }))

    // 3. Finger taps first item (700-900ms)
    fingerScale.value = withDelay(700, withSequence(
      withTiming(0.85, { duration: 80 }),
      withTiming(1, { duration: 80 }),
    ))
    item1Scale.value = withDelay(700, withSequence(
      withTiming(0.96, { duration: 80 }),
      withTiming(1, { duration: 80 }),
    ))
    check1Opacity.value = withDelay(800, withTiming(1, { duration: 200 }))
    check1BgOpacity.value = withDelay(780, withTiming(1, { duration: 200 }))

    // 4. Finger moves to second item (1000-1400ms)
    fingerTY.value = withDelay(1000, withTiming(-82, { duration: 400, easing: Easing.inOut(Easing.quad) }))

    // 5. Finger taps second item (1400-1600ms)
    fingerScale.value = withDelay(1400, withSequence(
      withTiming(0.85, { duration: 80 }),
      withTiming(1, { duration: 80 }),
    ))
    item2Scale.value = withDelay(1400, withSequence(
      withTiming(0.96, { duration: 80 }),
      withTiming(1, { duration: 80 }),
    ))
    check2Opacity.value = withDelay(1500, withTiming(1, { duration: 200 }))
    check2BgOpacity.value = withDelay(1480, withTiming(1, { duration: 200 }))

    // 6. Finger moves to start button (1800-2300ms)
    fingerTX.value = withDelay(1800, withTiming(0, { duration: 500, easing: Easing.inOut(Easing.quad) }))
    fingerTY.value = withDelay(1800, withTiming(-30, { duration: 500, easing: Easing.inOut(Easing.quad) }))

    // 7. Finger taps button (2300-2500ms)
    fingerScale.value = withDelay(2300, withSequence(
      withTiming(0.85, { duration: 80 }),
      withTiming(1, { duration: 80 }),
    ))
    buttonScale.value = withDelay(2300, withSequence(
      withTiming(0.94, { duration: 100 }),
      withTiming(1.02, { duration: 150 }),
      withTiming(1, { duration: 100 }),
    ))

    // 8. Button pulses (2600ms+)
    buttonGlow.value = withDelay(2600, withRepeat(
      withSequence(
        withTiming(1, { duration: 500 }),
        withTiming(0, { duration: 500 }),
      ),
      -1,
    ))

    // 9. Finger fades out (2600ms)
    fingerOpacity.value = withDelay(2600, withTiming(0, { duration: 300 }))
  }, [])

  const fingerStyle = useAnimatedStyle(() => ({
    opacity: fingerOpacity.value,
    transform: [
      { translateX: fingerTX.value },
      { translateY: fingerTY.value },
      { scale: fingerScale.value },
    ],
  }))
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
      <Animated.View style={[animStyles.listItem, item1Style]}>
        <Animated.View style={[animStyles.checkbox, check1BgStyle]}>
          <Animated.Text style={[animStyles.checkmarkText, check1Style]}>{'\u2713'}</Animated.Text>
        </Animated.View>
        <Text style={animStyles.itemName}>{t('Tutorial.exampleItem1')}</Text>
      </Animated.View>
      <Animated.View style={[animStyles.listItem, { marginTop: 4 }, item2Style]}>
        <Animated.View style={[animStyles.checkbox, check2BgStyle]}>
          <Animated.Text style={[animStyles.checkmarkText, check2Style]}>{'\u2713'}</Animated.Text>
        </Animated.View>
        <Text style={animStyles.itemName}>{t('Tutorial.exampleItem2')}</Text>
      </Animated.View>
      <Animated.View style={[animStyles.startButton, buttonStyle]}>
        <Text style={animStyles.startButtonText}>{t('ActiveShopping.startShopping')}</Text>
      </Animated.View>
      {/* Finger - absolute positioned to avoid clipping */}
      <Animated.View style={[animStyles.fingerAbsolute, fingerStyle]}>
        <FingerPointer />
      </Animated.View>
    </View>
  )
}

// ============================================================
// Step 6: Mark bought - finger taps item
// ============================================================
function MarkBoughtAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const fingerOpacity = useSharedValue(0)
  const fingerTY = useSharedValue(0)
  const fingerScale = useSharedValue(1)
  const tapScale = useSharedValue(1)
  const checkOpacity = useSharedValue(0)
  const circleFill = useSharedValue(0)
  const nameOpacity = useSharedValue(1)

  useEffect(() => {
    const CYCLE = 2800

    function animate(): void {
      // Reset
      fingerOpacity.value = 0
      fingerTY.value = 0
      fingerScale.value = 1
      tapScale.value = 1
      checkOpacity.value = 0
      circleFill.value = 0
      nameOpacity.value = 1

      // 1. Finger appears, moves up to item (0-500ms)
      fingerOpacity.value = withDelay(100, withTiming(1, { duration: 200 }))
      fingerTY.value = withDelay(100, withTiming(-50, { duration: 500, easing: Easing.out(Easing.quad) }))

      // 2. Finger taps (600-800ms)
      fingerScale.value = withDelay(600, withSequence(
        withTiming(0.85, { duration: 80 }),
        withTiming(1, { duration: 80 }),
      ))
      tapScale.value = withDelay(600, withSequence(
        withTiming(0.96, { duration: 80 }),
        withTiming(1, { duration: 120 }),
      ))

      // 3. Check fills (750-1000ms)
      circleFill.value = withDelay(750, withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) }))
      checkOpacity.value = withDelay(850, withTiming(1, { duration: 200 }))

      // 4. Name dims (900ms)
      nameOpacity.value = withDelay(900, withTiming(0.4, { duration: 200 }))

      // 5. Finger fades (1100ms)
      fingerOpacity.value = withDelay(1100, withTiming(0, { duration: 200 }))
    }

    animate()
    const interval = setInterval(animate, CYCLE)
    return () => clearInterval(interval)
  }, [])

  const fingerStyle = useAnimatedStyle(() => ({
    opacity: fingerOpacity.value,
    transform: [
      { translateY: fingerTY.value },
      { scale: fingerScale.value },
    ],
  }))
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
      <Animated.View style={[animStyles.shoppingItem, itemStyle]}>
        <Animated.View style={[animStyles.boughtCircle, circleStyle]}>
          <Animated.Text style={[animStyles.boughtCheck, checkStyle]}>{'\u2713'}</Animated.Text>
        </Animated.View>
        <Animated.Text style={[animStyles.itemName, nameStyle]}>{t('Tutorial.exampleItem1')}</Animated.Text>
        <View style={animStyles.qtyBadge}>
          <Text style={animStyles.qtyText}>x2</Text>
        </View>
      </Animated.View>
      {/* Finger - absolute positioned to avoid clipping */}
      <Animated.View style={[animStyles.fingerAbsolute, fingerStyle]}>
        <FingerPointer />
      </Animated.View>
    </View>
  )
}

// ============================================================
// Step 7: Finish shopping - finger taps button, dialog appears
// ============================================================
function FinishShoppingAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const fingerOpacity = useSharedValue(0)
  const fingerTX = useSharedValue(0)
  const fingerTY = useSharedValue(0)
  const fingerScale = useSharedValue(1)
  const buttonScale = useSharedValue(1)
  const dialogOpacity = useSharedValue(0)
  const dialogTranslateY = useSharedValue(40)
  const confirmHighlight = useSharedValue(0)

  useEffect(() => {
    // 1. Finger appears (200ms)
    fingerOpacity.value = withDelay(200, withTiming(1, { duration: 200 }))

    // 2. Finger moves up to button (200-700ms)
    fingerTY.value = withDelay(200, withTiming(-100, { duration: 500, easing: Easing.inOut(Easing.quad) }))

    // 3. Finger taps button (700-900ms)
    fingerScale.value = withDelay(700, withSequence(
      withTiming(0.85, { duration: 80 }),
      withTiming(1, { duration: 80 }),
    ))
    buttonScale.value = withDelay(700, withSequence(
      withTiming(0.94, { duration: 100 }),
      withTiming(1, { duration: 150 }),
    ))

    // 4. Dialog appears (1000-1400ms)
    dialogOpacity.value = withDelay(1000, withTiming(1, { duration: 300 }))
    dialogTranslateY.value = withDelay(1000, withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.3)) }))

    // 5. Finger moves to confirm (1500-2000ms)
    fingerTX.value = withDelay(1500, withTiming(40, { duration: 500, easing: Easing.inOut(Easing.quad) }))
    fingerTY.value = withDelay(1500, withTiming(-20, { duration: 500, easing: Easing.inOut(Easing.quad) }))

    // 6. Finger taps confirm (2100-2300ms)
    fingerScale.value = withDelay(2100, withSequence(
      withTiming(0.85, { duration: 80 }),
      withTiming(1, { duration: 80 }),
    ))
    confirmHighlight.value = withDelay(2100, withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0.6, { duration: 300 }),
    ))

    // 7. Finger fades (2400ms)
    fingerOpacity.value = withDelay(2400, withTiming(0, { duration: 300 }))
  }, [])

  const fingerStyle = useAnimatedStyle(() => ({
    opacity: fingerOpacity.value,
    transform: [
      { translateX: fingerTX.value },
      { translateY: fingerTY.value },
      { scale: fingerScale.value },
    ],
  }))
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
      <Animated.View style={[animStyles.finishButton, buttonStyle]}>
        <Text style={animStyles.finishButtonText}>{t('ActiveShopping.finishShopping')}</Text>
      </Animated.View>
      <Animated.View style={[animStyles.dialog, dialogStyle]}>
        <Text style={animStyles.dialogTitle}>{t('ActiveShopping.finishTitle')}</Text>
        <Text style={animStyles.dialogMessage}>{t('ActiveShopping.finishMessage')}</Text>
        <View style={animStyles.dialogButtons}>
          <Text style={animStyles.dialogCancel}>{t('ActiveShopping.cancel')}</Text>
          <Animated.Text style={[animStyles.dialogConfirm, confirmStyle]}>{t('ActiveShopping.finish')}</Animated.Text>
        </View>
      </Animated.View>
      {/* Finger - absolute positioned to avoid clipping */}
      <Animated.View style={[animStyles.fingerAbsolute, fingerStyle]}>
        <FingerPointer />
      </Animated.View>
    </View>
  )
}

// ============================================================
// Step 8: History (no finger)
// ============================================================
function HistoryAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
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

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepIndicator: {
    fontSize: theme.typography.fontSizeS,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.6)',
    padding: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  stepContent: {
    alignItems: 'center',
    overflow: 'visible',
  },
  animationArea: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'visible',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: theme.typography.fontSizeM,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressDotActive: {
    backgroundColor: theme.colors.tint,
    width: 24,
  },
  progressDotDone: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.sizes.radiusSm,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: theme.typography.fontSizeM,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  navButtonPrimary: {
    backgroundColor: theme.colors.tint,
  },
  navButtonPrimaryText: {
    fontSize: theme.typography.fontSizeM,
    color: '#ffffff',
    fontWeight: 'bold',
  },
}))

const animStyles = StyleSheet.create((theme) => ({
  scene: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
    overflow: 'visible',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '85%',
    gap: 8,
    marginBottom: 16,
  },
  inputField: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  inputText: {
    fontSize: 15,
    color: '#ffffff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  listItemFull: {
    width: '100%',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.tint,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: theme.colors.tint,
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
  },
  qtyBadge: {
    backgroundColor: 'rgba(76,175,80,0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
    overflow: 'hidden',
  },
  qtyText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.tint,
  },
  qtyFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
  },
  qtyFlashGreen: {
    backgroundColor: 'rgba(76,175,80,0.5)',
  },
  qtyFlashOrange: {
    backgroundColor: 'rgba(255,152,0,0.5)',
  },
  zoneLabel: {
    flexDirection: 'row',
    width: '85%',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  zoneLabelTextActive: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  zoneLabelTextDim: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.15)',
  },
  swipeDemo: {
    width: '85%',
    alignItems: 'center',
    gap: 8,
    overflow: 'visible',
  },
  itemWrapper: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
  },
  deleteBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 8,
    backgroundColor: theme.colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  plusBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 8,
    backgroundColor: theme.colors.tint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  minusBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 8,
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  bgText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  // Zone flash overlays - rendered INSIDE the list item
  zoneFlashLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '50%',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  zoneFlashRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '50%',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  fingerAbsolute: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    zIndex: 100,
  },
  shoppingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  boughtCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.tint,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boughtCheck: {
    color: theme.colors.tint,
    fontSize: 14,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: theme.colors.tint,
    borderRadius: 8,
    paddingVertical: 12,
    width: '85%',
    alignItems: 'center',
    marginTop: 12,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  finishButton: {
    backgroundColor: theme.colors.tint,
    borderRadius: 8,
    paddingVertical: 12,
    width: '85%',
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  statusRow: {
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  dialog: {
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderRadius: 14,
    padding: 20,
    width: '80%',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  dialogMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 16,
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  dialogCancel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },
  dialogConfirm: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.tint,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.tint,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  historyDate: {
    fontSize: 14,
    color: '#ffffff',
  },
  historyInfo: {
    fontSize: 14,
    color: theme.colors.tint,
    fontWeight: '600',
  },
}))
