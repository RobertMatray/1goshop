import React, { useState, useEffect } from 'react'
import { View, Text, Pressable, Modal } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { AddItemAnimation } from './AddItemAnimation'
import { DeleteItemAnimation } from './DeleteItemAnimation'
import { EditItemAnimation } from './EditItemAnimation'
import { QuantityAnimation } from './QuantityAnimation'
import { StartShoppingAnimation } from './StartShoppingAnimation'
import { MarkBoughtAnimation } from './MarkBoughtAnimation'
import { FinishShoppingAnimation } from './FinishShoppingAnimation'
import { HistoryAnimation } from './HistoryAnimation'
import { ShareListAnimation } from './ShareListAnimation'
import { JoinListAnimation } from './JoinListAnimation'
import { styles } from './styles'

interface Props {
  visible: boolean
  onClose: () => void
}

const TOTAL_STEPS = 11

export function TutorialOverlay({ visible, onClose }: Props): React.ReactElement | null {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
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
    t('Tutorial.step9Title'),
    t('Tutorial.step10Title'),
    t('Tutorial.step11Title'),
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
    t('Tutorial.step9Desc'),
    t('Tutorial.step10Desc'),
    t('Tutorial.step11Desc'),
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
                <StepAnimation step={step} t={t} />
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

function StepAnimation({ step, t }: { step: number; t: (key: string) => string }): React.ReactElement {
  switch (step) {
    case 0:
      return <AddItemAnimation t={t} />
    case 1:
      return <DeleteItemAnimation t={t} />
    case 2:
      return <EditItemAnimation t={t} />
    case 3:
      return <QuantityAnimation t={t} direction="increment" />
    case 4:
      return <QuantityAnimation t={t} direction="decrement" />
    case 5:
      return <StartShoppingAnimation t={t} />
    case 6:
      return <MarkBoughtAnimation t={t} />
    case 7:
      return <FinishShoppingAnimation t={t} />
    case 8:
      return <HistoryAnimation t={t} />
    case 9:
      return <ShareListAnimation t={t} />
    case 10:
      return <JoinListAnimation t={t} />
    default:
      return <View />
  }
}
