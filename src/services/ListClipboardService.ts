import * as Clipboard from 'expo-clipboard'
import type { ShoppingItem } from '../types/shopping'

/**
 * Remove diacritics from a string for comparison purposes.
 * "Mlieko" and "Mliéko" will match.
 */
export function removeDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Parse a text string into a list of item names.
 * Supports multiple formats:
 * - Plain lines (one item per line)
 * - Various line endings (\n, \r\n, \r)
 * - Tab-separated (Google Sheets, Excel) - takes first column
 * - Numbered lists (1. item, 1) item, 1: item)
 * - Bullet lists (- item, • item, * item, ‣ item, ▸ item)
 * - Checkbox lists (☐ item, ☑ item, [ ] item, [x] item, [X] item)
 * - Skips empty lines and whitespace-only lines
 * - Deduplicates within the parsed list
 */
export function parseListText(text: string): string[] {
  // Split by any line ending
  const lines = text.split(/\r\n|\r|\n/)

  const seen = new Set<string>()
  const result: string[] = []

  for (const rawLine of lines) {
    let line = rawLine.trim()
    if (!line) continue

    // Tab-separated: take only the first column
    if (line.includes('\t')) {
      line = line.split('\t')[0]?.trim() ?? ''
      if (!line) continue
    }

    // Remove checkbox prefixes: ☐ ☑ ✓ ✗ ☒ [] [x] [X] [ ] [✓] [✗] and similar
    line = line.replace(/^[\u2610\u2611\u2713\u2717\u2612]\s*/, '')
    line = line.replace(/^\[[ xX✓✗]?\]\s*/, '')

    // Remove numbered prefixes: 1. 1) 1: 1-
    line = line.replace(/^\d+[.):\-]\s*/, '')

    // Remove bullet prefixes: - • * ‣ ▸ ▹ ► ◦ ○ ●
    line = line.replace(/^[-•*‣▸▹►◦○●]\s*/, '')

    line = line.trim()
    if (!line) continue

    // Deduplicate within parsed text (case-insensitive, without diacritics)
    const key = removeDiacritics(line).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    result.push(line)
  }

  return result
}

/**
 * Export shopping list items to clipboard as a text list.
 * Format: one item per line (names only, no quantities).
 * Returns the number of items exported.
 */
export async function exportToClipboard(items: ShoppingItem[]): Promise<number> {
  if (items.length === 0) return 0

  const sorted = [...items].sort((a, b) => a.order - b.order)
  const lines = sorted.map((item) => item.name)

  await Clipboard.setStringAsync(lines.join('\n'))
  return lines.length
}

/**
 * Import shopping list items from clipboard.
 * Parses the clipboard text, compares against existing items
 * (case-insensitive, diacritics-insensitive comparison).
 * Duplicates are updated (name replaced with imported version).
 * Returns the names of added and updated items.
 */
export async function importFromClipboard(
  existingItems: ShoppingItem[],
): Promise<{ added: string[]; updated: string[]; empty: boolean }> {
  const text = await Clipboard.getStringAsync()

  if (!text || !text.trim()) {
    return { added: [], updated: [], empty: true }
  }

  const parsed = parseListText(text)

  // Build map of existing item names (normalized key → item id)
  const existingMap = new Map<string, string>()
  for (const item of existingItems) {
    existingMap.set(removeDiacritics(item.name).toLowerCase(), item.id)
  }

  const added: string[] = []
  const updated: string[] = []
  const seen = new Set<string>()

  for (const name of parsed) {
    const normalized = removeDiacritics(name).toLowerCase()
    if (seen.has(normalized)) continue
    seen.add(normalized)

    if (existingMap.has(normalized)) {
      updated.push(name)
    } else {
      added.push(name)
    }
  }

  return { added, updated, empty: false }
}

/**
 * Find the existing item ID that matches a name (diacritics-insensitive).
 */
export function findExistingItemId(name: string, existingItems: ShoppingItem[]): string | undefined {
  const normalized = removeDiacritics(name).toLowerCase()
  return existingItems.find(
    (item) => removeDiacritics(item.name).toLowerCase() === normalized,
  )?.id
}
