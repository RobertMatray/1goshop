import React, { useState, useEffect } from 'react'
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
              <Text style={styles.closeButton}>✕</Text>
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
                <Text style={styles.navButtonText}>‹ {t('Tutorial.prev')}</Text>
              </Pressable>
            ) : (
              <View style={styles.navButton} />
            )}

            {step < TOTAL_STEPS - 1 ? (
              <Pressable style={[styles.navButton, styles.navButtonPrimary]} onPress={() => setStep(step + 1)}>
                <Text style={styles.navButtonPrimaryText}>{t('Tutorial.next')} ›</Text>
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

// Step 1: Add item animation
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

// Step 2: Delete item (LEFT half swipe left)
function DeleteItemAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const translateX = useSharedValue(0)
  const bgOpacity = useSharedValue(0)
  const zoneHighlight = useSharedValue(0)
  const grabFlash = useSharedValue(0)

  useEffect(() => {
    zoneHighlight.value = withDelay(200, withTiming(1, { duration: 400 }))
    const animate = (): void => {
      translateX.value = 0
      bgOpacity.value = 0
      // Flash the left half of the item to show where to grab
      grabFlash.value = 0
      grabFlash.value = withDelay(300, withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0.3, { duration: 200 }),
        withTiming(0.8, { duration: 150 }),
        withTiming(0, { duration: 300 }),
      ))
      translateX.value = withDelay(1200, withTiming(-60, { duration: 600, easing: Easing.out(Easing.quad) }))
      bgOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }))
      translateX.value = withDelay(2000, withTiming(0, { duration: 300 }))
      bgOpacity.value = withDelay(2000, withTiming(0, { duration: 300 }))
    }
    animate()
    const interval = setInterval(animate, 3200)
    return () => clearInterval(interval)
  }, [])

  const itemStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }))
  const leftZoneStyle = useAnimatedStyle(() => ({
    opacity: 0.15 + zoneHighlight.value * 0.25,
  }))
  const grabFlashLeftStyle = useAnimatedStyle(() => ({
    opacity: grabFlash.value,
  }))

  return (
    <View style={animStyles.scene}>
      <View style={animStyles.splitDiagram}>
        <Animated.View style={[animStyles.splitLeft, animStyles.splitActive, leftZoneStyle]}>
          <Text style={animStyles.splitLabelActive}>← DELETE</Text>
        </Animated.View>
        <View style={[animStyles.splitRight, animStyles.splitInactive]}>
          <Text style={animStyles.splitLabelInactive}>+1 / -1</Text>
        </View>
      </View>
      <View style={animStyles.swipeDemo}>
        <View style={animStyles.itemWrapper}>
          <Animated.View style={[animStyles.deleteBg, bgStyle]}>
            <Text style={animStyles.bgText}>🗑</Text>
          </Animated.View>
          <Animated.View style={[animStyles.listItem, itemStyle]}>
            {/* Flash overlay on left half */}
            <Animated.View style={[animStyles.grabFlashLeft, grabFlashLeftStyle]} />
            <View style={animStyles.checkbox} />
            <Text style={animStyles.itemName}>{t('Tutorial.exampleItem2')}</Text>
          </Animated.View>
        </View>
        <View style={animStyles.arrowRow}>
          <View style={animStyles.arrowLeft}>
            <SwipeArrow direction="left" />
          </View>
        </View>
      </View>
    </View>
  )
}

// Step 3: Increment (+1) - RIGHT half swipe right
function IncrementAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const translateX = useSharedValue(0)
  const bgOpacity = useSharedValue(0)
  const zoneHighlight = useSharedValue(0)
  const grabFlash = useSharedValue(0)
  const [displayQty, setDisplayQty] = useState(1)

  useEffect(() => {
    zoneHighlight.value = withDelay(200, withTiming(1, { duration: 400 }))
    const animate = (): void => {
      translateX.value = 0
      bgOpacity.value = 0
      setDisplayQty(1)
      // Flash the right half of the item to show where to grab
      grabFlash.value = 0
      grabFlash.value = withDelay(300, withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0.3, { duration: 200 }),
        withTiming(0.8, { duration: 150 }),
        withTiming(0, { duration: 300 }),
      ))
      translateX.value = withDelay(1200, withTiming(60, { duration: 600, easing: Easing.out(Easing.quad) }))
      bgOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }))
      translateX.value = withDelay(2000, withTiming(0, { duration: 300 }))
      bgOpacity.value = withDelay(2000, withTiming(0, { duration: 300 }))
      setTimeout(() => setDisplayQty(2), 2000)
    }
    animate()
    const interval = setInterval(animate, 3200)
    return () => clearInterval(interval)
  }, [])

  const itemStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }))
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }))
  const rightZoneStyle = useAnimatedStyle(() => ({
    opacity: 0.15 + zoneHighlight.value * 0.25,
  }))
  const grabFlashRightStyle = useAnimatedStyle(() => ({
    opacity: grabFlash.value,
  }))

  return (
    <View style={animStyles.scene}>
      <View style={animStyles.splitDiagram}>
        <View style={[animStyles.splitLeft, animStyles.splitInactive]}>
          <Text style={animStyles.splitLabelInactive}>DELETE</Text>
        </View>
        <Animated.View style={[animStyles.splitRight, animStyles.splitActive, rightZoneStyle]}>
          <Text style={animStyles.splitLabelActive}>+1 →</Text>
        </Animated.View>
      </View>
      <View style={animStyles.swipeDemo}>
        <View style={animStyles.itemWrapper}>
          <Animated.View style={[animStyles.plusBg, bgStyle]}>
            <Text style={animStyles.bgText}>+1</Text>
          </Animated.View>
          <Animated.View style={[animStyles.listItem, itemStyle]}>
            {/* Flash overlay on right half */}
            <Animated.View style={[animStyles.grabFlashRight, grabFlashRightStyle]} />
            <View style={animStyles.checkbox} />
            <Text style={animStyles.itemName}>{t('Tutorial.exampleItem3')}</Text>
            {displayQty > 1 && (
              <View style={animStyles.qtyBadge}>
                <Text style={animStyles.qtyText}>x{displayQty}</Text>
              </View>
            )}
          </Animated.View>
        </View>
        <View style={animStyles.arrowRow}>
          <View style={animStyles.arrowRight}>
            <SwipeArrow direction="right" />
          </View>
        </View>
      </View>
    </View>
  )
}

// Step 4: Decrement (-1) - RIGHT half swipe left
function DecrementAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const translateX = useSharedValue(0)
  const bgOpacity = useSharedValue(0)
  const zoneHighlight = useSharedValue(0)
  const grabFlash = useSharedValue(0)
  const [displayQty, setDisplayQty] = useState(3)

  useEffect(() => {
    zoneHighlight.value = withDelay(200, withTiming(1, { duration: 400 }))
    const animate = (): void => {
      translateX.value = 0
      bgOpacity.value = 0
      setDisplayQty(3)
      // Flash the right half of the item to show where to grab
      grabFlash.value = 0
      grabFlash.value = withDelay(300, withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0.3, { duration: 200 }),
        withTiming(0.8, { duration: 150 }),
        withTiming(0, { duration: 300 }),
      ))
      translateX.value = withDelay(1200, withTiming(-60, { duration: 600, easing: Easing.out(Easing.quad) }))
      bgOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }))
      translateX.value = withDelay(2000, withTiming(0, { duration: 300 }))
      bgOpacity.value = withDelay(2000, withTiming(0, { duration: 300 }))
      setTimeout(() => setDisplayQty(2), 2000)
    }
    animate()
    const interval = setInterval(animate, 3200)
    return () => clearInterval(interval)
  }, [])

  const itemStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }))
  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }))
  const rightZoneStyle = useAnimatedStyle(() => ({
    opacity: 0.15 + zoneHighlight.value * 0.25,
  }))
  const grabFlashRightStyle = useAnimatedStyle(() => ({
    opacity: grabFlash.value,
  }))

  return (
    <View style={animStyles.scene}>
      <View style={animStyles.splitDiagram}>
        <View style={[animStyles.splitLeft, animStyles.splitInactive]}>
          <Text style={animStyles.splitLabelInactive}>DELETE</Text>
        </View>
        <Animated.View style={[animStyles.splitRight, animStyles.splitActive, rightZoneStyle]}>
          <Text style={animStyles.splitLabelActive}>← -1</Text>
        </Animated.View>
      </View>
      <View style={animStyles.swipeDemo}>
        <View style={animStyles.itemWrapper}>
          <Animated.View style={[animStyles.minusBg, bgStyle]}>
            <Text style={animStyles.bgText}>-1</Text>
          </Animated.View>
          <Animated.View style={[animStyles.listItem, itemStyle]}>
            {/* Flash overlay on right half */}
            <Animated.View style={[animStyles.grabFlashRight, grabFlashRightStyle]} />
            <View style={animStyles.checkbox} />
            <Text style={animStyles.itemName}>{t('Tutorial.exampleItem4')}</Text>
            <View style={animStyles.qtyBadge}>
              <Text style={animStyles.qtyText}>x{displayQty}</Text>
            </View>
          </Animated.View>
        </View>
        <View style={animStyles.arrowRow}>
          <View style={animStyles.arrowRight}>
            <SwipeArrow direction="left" />
          </View>
        </View>
      </View>
    </View>
  )
}

// Step 5: Start shopping
function StartShoppingAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const check1 = useSharedValue(0)
  const check2 = useSharedValue(0)
  const buttonScale = useSharedValue(1)
  const buttonGlow = useSharedValue(0)

  useEffect(() => {
    check1.value = withDelay(300, withTiming(1, { duration: 300 }))
    check2.value = withDelay(700, withTiming(1, { duration: 300 }))
    buttonGlow.value = withDelay(1200, withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0, { duration: 600 }),
      ),
      -1,
    ))
    buttonScale.value = withDelay(1200, withRepeat(
      withSequence(
        withTiming(1.03, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
    ))
  }, [])

  const check1Style = useAnimatedStyle(() => ({ opacity: check1.value }))
  const check2Style = useAnimatedStyle(() => ({ opacity: check2.value }))
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    opacity: 0.8 + buttonGlow.value * 0.2,
  }))

  return (
    <View style={animStyles.scene}>
      <View style={animStyles.listItem}>
        <View style={[animStyles.checkbox, animStyles.checkboxChecked]}>
          <Animated.Text style={[animStyles.checkmarkText, check1Style]}>✓</Animated.Text>
        </View>
        <Text style={animStyles.itemName}>{t('Tutorial.exampleItem1')}</Text>
      </View>
      <View style={[animStyles.listItem, { marginTop: 4 }]}>
        <View style={[animStyles.checkbox, animStyles.checkboxChecked]}>
          <Animated.Text style={[animStyles.checkmarkText, check2Style]}>✓</Animated.Text>
        </View>
        <Text style={animStyles.itemName}>{t('Tutorial.exampleItem2')}</Text>
      </View>
      <Animated.View style={[animStyles.startButton, buttonStyle]}>
        <Text style={animStyles.startButtonText}>{t('ActiveShopping.startShopping')}</Text>
      </Animated.View>
    </View>
  )
}

// Step 6: Mark bought
function MarkBoughtAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const tapScale = useSharedValue(1)
  const checkOpacity = useSharedValue(0)
  const strikeWidth = useSharedValue(0)

  useEffect(() => {
    const animate = (): void => {
      tapScale.value = 1
      checkOpacity.value = 0
      strikeWidth.value = 0
      tapScale.value = withDelay(500, withSequence(
        withTiming(0.96, { duration: 80 }),
        withTiming(1, { duration: 80 }),
      ))
      checkOpacity.value = withDelay(660, withTiming(1, { duration: 200 }))
      strikeWidth.value = withDelay(660, withTiming(1, { duration: 300 }))
    }
    animate()
    const interval = setInterval(animate, 2000)
    return () => clearInterval(interval)
  }, [])

  const itemStyle = useAnimatedStyle(() => ({ transform: [{ scale: tapScale.value }] }))
  const checkStyle = useAnimatedStyle(() => ({ opacity: checkOpacity.value }))
  const nameStyle = useAnimatedStyle(() => ({ opacity: 1 - strikeWidth.value * 0.4 }))

  return (
    <View style={animStyles.scene}>
      <Text style={animStyles.sceneLabel}>TAP</Text>
      <Animated.View style={[animStyles.shoppingItem, itemStyle]}>
        <View style={animStyles.boughtCircle}>
          <Animated.Text style={[animStyles.boughtCheck, checkStyle]}>✓</Animated.Text>
        </View>
        <Animated.Text style={[animStyles.itemName, nameStyle]}>{t('Tutorial.exampleItem1')}</Animated.Text>
        <View style={animStyles.qtyBadge}>
          <Text style={animStyles.qtyText}>x2</Text>
        </View>
      </Animated.View>
      <View style={animStyles.fingerIcon}>
        <Text style={{ fontSize: 28 }}>👆</Text>
      </View>
    </View>
  )
}

// Step 7: Finish shopping
function FinishShoppingAnimation({ t }: { t: (key: string) => string }): React.ReactElement {
  const buttonScale = useSharedValue(1)
  const dialogOpacity = useSharedValue(0)
  const dialogScale = useSharedValue(0.8)

  useEffect(() => {
    buttonScale.value = withDelay(500, withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 }),
    ))
    dialogOpacity.value = withDelay(800, withTiming(1, { duration: 300 }))
    dialogScale.value = withDelay(800, withTiming(1, { duration: 300, easing: Easing.out(Easing.back(1.5)) }))
  }, [])

  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }))
  const dialogStyle = useAnimatedStyle(() => ({
    opacity: dialogOpacity.value,
    transform: [{ scale: dialogScale.value }],
  }))

  return (
    <View style={animStyles.scene}>
      <View style={animStyles.statusRow}>
        <Text style={animStyles.statusText}>3 / 3 ✓</Text>
      </View>
      <Animated.View style={[animStyles.finishButton, buttonStyle]}>
        <Text style={animStyles.finishButtonText}>{t('ActiveShopping.finishShopping')}</Text>
      </Animated.View>
      <Animated.View style={[animStyles.dialog, dialogStyle]}>
        <Text style={animStyles.dialogTitle}>{t('ActiveShopping.finishTitle')}</Text>
        <Text style={animStyles.dialogMessage}>{t('ActiveShopping.finishMessage')}</Text>
        <View style={animStyles.dialogButtons}>
          <Text style={animStyles.dialogCancel}>{t('ActiveShopping.cancel')}</Text>
          <Text style={animStyles.dialogConfirm}>{t('ActiveShopping.finish')}</Text>
        </View>
      </Animated.View>
    </View>
  )
}

// Step 8: History
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
        <Text style={animStyles.historyInfo}>5 / 5 ✓</Text>
      </Animated.View>
      <Animated.View style={[animStyles.historyCard, card2Style]}>
        <Text style={animStyles.historyDate}>14.2.2026</Text>
        <Text style={animStyles.historyInfo}>4 / 5 ✓</Text>
      </Animated.View>
    </View>
  )
}

// Animated swipe arrow helper
function SwipeArrow({ direction }: { direction: 'left' | 'right' }): React.ReactElement {
  const translateX = useSharedValue(0)

  useEffect(() => {
    const offset = direction === 'left' ? -12 : 12
    translateX.value = withRepeat(
      withSequence(
        withTiming(offset, { duration: 500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    )
  }, [direction])

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  return (
    <Animated.View style={[animStyles.arrowContainer, arrowStyle]}>
      <Text style={animStyles.arrowText}>{direction === 'left' ? '👈' : '👉'}</Text>
    </Animated.View>
  )
}

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
  },
  animationArea: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
  },
  sceneLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.tint,
    letterSpacing: 2,
    marginBottom: 4,
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
  checkboxChecked: {
    backgroundColor: 'rgba(76,175,80,0.2)',
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
  },
  qtyText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.tint,
  },
  splitDiagram: {
    flexDirection: 'row',
    width: '85%',
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  splitLeft: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.3)',
  },
  splitRight: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  splitInactive: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  splitLabelActive: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  splitLabelInactive: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 1,
  },
  swipeDemo: {
    width: '85%',
    alignItems: 'center',
    gap: 8,
  },
  itemWrapper: {
    width: '100%',
    position: 'relative',
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
  grabFlashLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '50%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  grabFlashRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '50%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  arrowRow: {
    width: '100%',
    flexDirection: 'row',
    marginTop: 4,
  },
  arrowLeft: {
    flex: 1,
    alignItems: 'center',
  },
  arrowRight: {
    flex: 1,
    marginLeft: '50%',
    alignItems: 'center',
  },
  arrowContainer: {
    marginTop: 0,
  },
  arrowText: {
    fontSize: 24,
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
  fingerIcon: {
    marginTop: 8,
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
