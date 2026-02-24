import React, { useMemo, useCallback } from 'react'
import { View, Text, Pressable, FlatList, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StyleSheet } from 'react-native-unistyles'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../navigation/AppNavigator'
import { useActiveShoppingStore } from '../../stores/ActiveShoppingStore'
import { useShoppingListStore } from '../../stores/ShoppingListStore'
import { ActiveShoppingItem } from './components/ActiveShoppingItem'
import type { ActiveShoppingItem as ActiveShoppingItemType } from '../../types/shopping'

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ActiveShoppingScreen'>

export function ActiveShoppingScreen(): React.ReactElement {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const insets = useSafeAreaInsets()

  const session = useActiveShoppingStore((s) => s.session)
  const showBought = useActiveShoppingStore((s) => s.showBought)
  const toggleBought = useActiveShoppingStore((s) => s.toggleBought)
  const toggleShowBought = useActiveShoppingStore((s) => s.toggleShowBought)
  const finishShopping = useActiveShoppingStore((s) => s.finishShopping)
  const uncheckBoughtItems = useShoppingListStore((s) => s.uncheckItems)

  const allItems = useMemo(() => {
    if (!session) return []
    return [...session.items].sort((a, b) => a.order - b.order)
  }, [session])

  const visibleItems = useMemo(() => {
    if (showBought) return allItems
    return allItems.filter((item) => !item.isBought)
  }, [allItems, showBought])

  const boughtCount = useMemo(() => allItems.filter((i) => i.isBought).length, [allItems])
  const totalCount = allItems.length

  const renderItem = useCallback(
    ({ item }: { item: ActiveShoppingItemType }) => (
      <ActiveShoppingItem item={item} onToggleBought={toggleBought} />
    ),
    [toggleBought],
  )

  const keyExtractor = useCallback((item: ActiveShoppingItemType) => item.id, [])

  if (!session) return <View style={styles.container} />

  return (
    <View style={styles.container}>
      <View style={styles.listWrapper}>
        {visibleItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyText}>{t('ActiveShopping.allBought')}</Text>
          </View>
        ) : (
          <FlatList
            data={visibleItems}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Text style={styles.statusText}>
          {t('ActiveShopping.boughtCount', { bought: boughtCount, total: totalCount })}
        </Text>

        <View style={styles.buttonsRow}>
          <Pressable style={styles.toggleButton} onPress={toggleShowBought}>
            <Text style={styles.toggleButtonText}>
              {showBought ? t('ActiveShopping.hideBought') : t('ActiveShopping.showBought')}
            </Text>
          </Pressable>

          <Pressable style={styles.finishButton} onPress={handleFinish}>
            <Text style={styles.finishButtonText}>{t('ActiveShopping.finishShopping')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )

  function handleFinish(): void {
    Alert.alert(
      t('ActiveShopping.finishTitle'),
      t('ActiveShopping.finishMessage'),
      [
        { text: t('ActiveShopping.cancel'), style: 'cancel' },
        {
          text: t('ActiveShopping.finish'),
          onPress: async () => {
            const boughtIds = session?.items.filter((i) => i.isBought).map((i) => i.id) ?? []
            if (boughtIds.length > 0) {
              uncheckBoughtItems(boughtIds)
            }
            await finishShopping()
            navigation.goBack()
          },
        },
      ],
    )
  }
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: theme.sizes.screenPadding,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: theme.typography.fontSizeL,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: theme.sizes.screenPadding,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
  },
  statusText: {
    fontSize: theme.typography.fontSizeS,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.sizes.radiusSm,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  toggleButtonText: {
    fontSize: theme.typography.fontSizeS,
    fontWeight: '600',
    color: theme.colors.text,
  },
  finishButton: {
    flex: 1,
    backgroundColor: theme.colors.tint,
    borderRadius: theme.sizes.radiusSm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  finishButtonText: {
    fontSize: theme.typography.fontSizeS,
    fontWeight: 'bold',
    color: '#ffffff',
  },
}))
