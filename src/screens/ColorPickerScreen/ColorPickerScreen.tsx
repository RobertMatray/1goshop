import React, { useState } from 'react'
import { View, Text, Pressable, ScrollView, Alert } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { useTranslation } from 'react-i18next'
import ColorPicker, { HueSlider, SaturationSlider } from 'reanimated-color-picker'
import { useAccentColorStore } from '../../stores/AccentColorStore'
import { deriveThemeColors, hexToHsl } from '../../services/ColorUtils'
import { defaultLightColors } from '../../unistyles'
import { Ionicons } from '@expo/vector-icons'

export function ColorPickerScreen(): React.ReactElement {
  const { t } = useTranslation()
  const { activeColor, savedColors, setActiveColor, addSavedColor, removeSavedColor } =
    useAccentColorStore()
  const [previewColor, setPreviewColor] = useState(activeColor ?? defaultLightColors.tint)
  const previewDerived = deriveThemeColors(previewColor)
  const textOnPreview = getTextOnColor(previewDerived.light.tint)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.pickerSection}>
        <ColorPicker
          value={previewColor}
          onCompleteJS={handleColorComplete}
          thumbSize={32}
          thumbShape="circle"
          style={styles.colorPicker}
        >
          <View style={styles.sliderRow}>
            <View
              style={[styles.previewSwatch, { backgroundColor: previewColor }]}
            />
            <HueSlider style={styles.hueSlider} />
          </View>
          <SaturationSlider style={styles.saturationSlider} />
        </ColorPicker>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('ColorPicker.preview')}</Text>
        <View style={styles.previewContainer}>
          <View style={[styles.previewHeader, { backgroundColor: previewDerived.light.tint }]}>
            <Text style={[styles.previewHeaderText, { color: textOnPreview }]}>1GoShop</Text>
          </View>

          <View style={styles.previewItem}>
            <View style={[styles.previewCheckbox, { borderColor: previewDerived.light.tint }]}>
              <Ionicons name="checkmark" size={14} color={previewDerived.light.tint} />
            </View>
            <Text style={styles.previewItemText}>{t('Tutorial.exampleItem1')}</Text>
            <View style={[styles.previewBadge, { backgroundColor: previewDerived.light.quantityBg }]}>
              <Text style={[styles.previewBadgeText, { color: previewDerived.light.tint }]}>2</Text>
            </View>
          </View>

          <View style={[styles.previewItem, { backgroundColor: previewDerived.light.checked }]}>
            <View
              style={[
                styles.previewCheckbox,
                { borderColor: previewDerived.light.tint, backgroundColor: previewDerived.light.tint },
              ]}
            >
              <Ionicons name="checkmark" size={14} color={textOnPreview} />
            </View>
            <Text style={styles.previewItemText}>{t('Tutorial.exampleItem2')}</Text>
            <View style={[styles.previewBadge, { backgroundColor: previewDerived.light.quantityBg }]}>
              <Text style={[styles.previewBadgeText, { color: previewDerived.light.tint }]}>1</Text>
            </View>
          </View>

          <View
            style={[styles.previewButton, { backgroundColor: previewDerived.light.tint }]}
          >
            <Text style={[styles.previewButtonText, { color: textOnPreview }]}>{t('ActiveShopping.startShopping')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={styles.saveButton} onPress={handleSaveColor}>
          <Text style={styles.saveButtonText}>{t('ColorPicker.saveColor')}</Text>
        </Pressable>
        <Pressable style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>{t('ColorPicker.resetDefault')}</Text>
        </Pressable>
      </View>

      {savedColors.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('ColorPicker.savedColors')}</Text>
          <View style={styles.savedColorsRow}>
            {savedColors.map((color) => (
              <Pressable key={color.id} onPress={() => handleApplySaved(color.hex)} onLongPress={() => handleDeleteSaved(color.id, color.hex)}>
                <View
                  style={[
                    styles.savedColorCircle,
                    { backgroundColor: color.hex },
                    activeColor?.toLowerCase() === color.hex.toLowerCase() && styles.savedColorActive,
                  ]}
                >
                  {activeColor?.toLowerCase() === color.hex.toLowerCase() && (
                    <Ionicons name="checkmark" size={18} color={textOnPreview} />
                  )}
                </View>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hintText}>{t('ColorPicker.longPressDelete')}</Text>
        </View>
      )}
    </ScrollView>
  )

  function handleColorComplete(color: { hex: string }): void {
    setPreviewColor(color.hex)
  }

  function handleSaveColor(): void {
    addSavedColor(previewColor)
    setActiveColor(previewColor)
  }

  function handleReset(): void {
    setActiveColor(null)
    setPreviewColor(defaultLightColors.tint)
  }

  function handleApplySaved(hex: string): void {
    setActiveColor(hex)
    setPreviewColor(hex)
  }

  function handleDeleteSaved(id: string, hex: string): void {
    Alert.alert(t('ColorPicker.deleteTitle'), hex, [
      { text: t('ColorPicker.cancel'), style: 'cancel' },
      {
        text: t('ColorPicker.delete'),
        style: 'destructive',
        onPress: () => {
          removeSavedColor(id)
          if (activeColor?.toLowerCase() === hex.toLowerCase()) {
            setActiveColor(null)
            setPreviewColor(defaultLightColors.tint)
          }
        },
      },
    ])
  }
}

function getTextOnColor(hex: string): string {
  const { l } = hexToHsl(hex)
  return l > 55 ? '#000000' : '#ffffff'
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.sizes.screenPadding,
    gap: 16,
    paddingBottom: 40,
  },
  pickerSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.sizes.radiusLg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  colorPicker: {
    width: '100%',
    gap: 16,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: theme.colors.surfaceBorder,
  },
  hueSlider: {
    flex: 1,
    height: 48,
    borderRadius: 24,
  },
  saturationSlider: {
    height: 48,
    borderRadius: 24,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.sizes.radiusLg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSizeL,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  previewContainer: {
    borderRadius: theme.sizes.radiusSm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  previewHeader: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  previewHeaderText: {
    fontWeight: 'bold',
    fontSize: theme.typography.fontSizeM,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    backgroundColor: theme.colors.surface,
  },
  previewCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewItemText: {
    flex: 1,
    fontSize: theme.typography.fontSizeM,
    color: theme.colors.text,
  },
  previewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  previewBadgeText: {
    fontSize: theme.typography.fontSizeS,
    fontWeight: 'bold',
  },
  previewButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 10,
    borderRadius: theme.sizes.radiusSm,
  },
  previewButtonText: {
    fontWeight: 'bold',
    fontSize: theme.typography.fontSizeM,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.sizes.radiusSm,
    backgroundColor: theme.colors.tint,
    alignItems: 'center',
  },
  saveButtonText: {
    color: theme.colors.textOnTint,
    fontWeight: 'bold',
    fontSize: theme.typography.fontSizeM,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.sizes.radiusSm,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  resetButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.typography.fontSizeM,
  },
  savedColorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  savedColorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  savedColorActive: {
    borderColor: theme.colors.text,
    borderWidth: 3,
  },
  hintText: {
    fontSize: theme.typography.fontSizeXS,
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
}))
