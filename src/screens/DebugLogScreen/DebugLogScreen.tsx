import React, { useState, useEffect, useRef } from 'react'
import { View, Text, FlatList, Pressable } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getDebugLogs, clearDebugLogs, subscribeDebugLogs, type LogEntry } from '../../services/DebugLogger'

export function DebugLogScreen(): React.ReactElement {
  const [logs, setLogs] = useState<LogEntry[]>(() => getDebugLogs())
  const insets = useSafeAreaInsets()
  const flatListRef = useRef<FlatList<LogEntry>>(null)

  useEffect(() => {
    return subscribeDebugLogs(() => {
      setLogs([...getDebugLogs()])
    })
  }, [])

  useEffect(() => {
    if (logs.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [logs.length])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{logs.length} entries</Text>
        <Pressable onPress={handleClear} style={styles.clearButton}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>
      <FlatList
        ref={flatListRef}
        data={logs}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}
        showsVerticalScrollIndicator
      />
    </View>
  )

  function handleClear(): void {
    clearDebugLogs()
    setLogs([])
  }
}

function keyExtractor(_item: LogEntry, index: number): string {
  return String(index)
}

function renderItem({ item }: { item: LogEntry }): React.ReactElement {
  const tagColor = getTagColor(item.tag)
  return (
    <View style={logStyles.row}>
      <Text style={logStyles.time}>{item.time}</Text>
      <Text style={[logStyles.tag, { color: tagColor }]}>{item.tag}</Text>
      <Text style={logStyles.message} numberOfLines={3}>{item.message}</Text>
    </View>
  )
}

function getTagColor(tag: string): string {
  switch (tag) {
    case 'Firebase': return '#FF9800'
    case 'Sync': return '#2196F3'
    case 'Store': return '#4CAF50'
    case 'Write': return '#9C27B0'
    default: return '#999'
  }
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerText: {
    color: '#999',
    fontSize: 13,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  clearText: {
    color: '#ff5555',
    fontSize: 13,
    fontWeight: 'bold',
  },
}))

const logStyles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  time: {
    color: '#666',
    fontSize: 10,
    fontFamily: 'monospace',
    width: 85,
  },
  tag: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    width: 60,
  },
  message: {
    color: '#ccc',
    fontSize: 10,
    fontFamily: 'monospace',
    flex: 1,
  },
}))
