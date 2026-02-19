import React, { useEffect, useMemo } from 'react'
import { View, Text, FlatList, Alert, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StyleSheet } from 'react-native-unistyles'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { useActiveShoppingStore } from '../../stores/ActiveShoppingStore'
import type { ShoppingSession } from '../../types/shopping'

export function ShoppingHistoryScreen(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const history = useActiveShoppingStore((s) => s.history)
  const loadHistory = useActiveShoppingStore((s) => s.loadHistory)
  const removeSession = useActiveShoppingStore((s) => s.removeSession)
  const clearHistory = useActiveShoppingStore((s) => s.clearHistory)

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const stats = useMemo(() => {
    const totalSessions = history.length
    const totalItems = history.reduce((sum, s) => sum + s.items.length, 0)
    const totalBought = history.reduce((sum, s) => sum + s.items.filter((i) => i.isBought).length, 0)
    return { totalSessions, totalItems, totalBought }
  }, [history])

  return (
    <View style={styles.container}>
      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>{t('History.empty')}</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>{t('History.statistics')}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalSessions}</Text>
                <Text style={styles.statLabel}>{t('History.totalSessions')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalItems}</Text>
                <Text style={styles.statLabel}>{t('History.totalItems')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalBought}</Text>
                <Text style={styles.statLabel}>{t('History.totalBought')}</Text>
              </View>
            </View>
          </View>

          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <HistoryItem session={item} lang={i18n.language} t={t} onDelete={handleDeleteSession} />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {history.length > 0 && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <Pressable style={styles.clearButton} onPress={handleClearHistory}>
            <Text style={styles.clearButtonText}>{t('History.clearHistory')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  )

  function handleDeleteSession(id: string, dateStr: string): void {
    Alert.alert(
      t('History.deleteTitle'),
      dateStr,
      [
        { text: t('History.cancel'), style: 'cancel' },
        {
          text: t('History.delete'),
          style: 'destructive',
          onPress: () => removeSession(id),
        },
      ],
    )
  }

  function handleClearHistory(): void {
    Alert.alert(
      t('History.clearTitle'),
      t('History.clearMessage'),
      [
        { text: t('History.cancel'), style: 'cancel' },
        {
          text: t('History.clear'),
          style: 'destructive',
          onPress: () => clearHistory(),
        },
      ],
    )
  }
}

interface HistoryItemProps {
  session: ShoppingSession
  lang: string
  t: (key: string, options?: Record<string, unknown>) => string
  onDelete: (id: string, dateStr: string) => void
}

function HistoryItem({ session, lang, t, onDelete }: HistoryItemProps): React.ReactElement {
  const boughtCount = session.items.filter((i) => i.isBought).length
  const totalCount = session.items.length

  const dateStr = session.finishedAt
    ? formatDate(new Date(session.finishedAt), lang)
    : formatDate(new Date(session.startedAt), lang)

  return (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.historyHeaderLeft}>
          <Text style={styles.historyDate}>{dateStr}</Text>
          <Text style={styles.historyStats}>
            {t('History.boughtOf', { bought: boughtCount, total: totalCount })}
          </Text>
        </View>
        <Pressable onPress={() => onDelete(session.id, dateStr)} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={styles.deleteIcon.color} />
        </Pressable>
      </View>
      <View style={styles.historyItems}>
        {session.items.map((item) => (
          <View key={item.id} style={styles.historyItemRow}>
            <Text style={[styles.historyItemCheck, item.isBought && styles.historyItemBought]}>
              {item.isBought ? '✓' : '○'}
            </Text>
            <Text
              style={[styles.historyItemName, item.isBought && styles.historyItemNameBought]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {item.quantity > 1 && (
              <Text style={styles.historyItemQuantity}>x{item.quantity}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  )
}

function formatDate(date: Date, lang: string): string {
  const locale = lang === 'sk' ? 'sk-SK' : 'en-US'
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  statsCard: {
    margin: theme.sizes.screenPadding,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.sizes.radiusLg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  statsTitle: {
    fontSize: theme.typography.fontSizeM,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.tint,
  },
  statLabel: {
    fontSize: theme.typography.fontSizeXS,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: theme.sizes.screenPadding,
    paddingBottom: 16,
  },
  historyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.sizes.radiusSm,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  historyHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteIcon: {
    color: theme.colors.textSecondary,
  },
  historyDate: {
    fontSize: theme.typography.fontSizeS,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  historyStats: {
    fontSize: theme.typography.fontSizeXS,
    color: theme.colors.tint,
    fontWeight: '600',
  },
  historyItems: {
    gap: 4,
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyItemCheck: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    width: 20,
  },
  historyItemBought: {
    color: theme.colors.tint,
  },
  historyItemName: {
    flex: 1,
    fontSize: theme.typography.fontSizeS,
    color: theme.colors.text,
  },
  historyItemNameBought: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
  },
  historyItemQuantity: {
    fontSize: theme.typography.fontSizeXS,
    color: theme.colors.tint,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: theme.sizes.screenPadding,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceBorder,
  },
  clearButton: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.sizes.radiusSm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: theme.typography.fontSizeS,
    fontWeight: 'bold',
  },
}))
