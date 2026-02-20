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

    // Remove checkbox prefixes: ☐ ☑ ✓ ✗ [ ] [x] [X] [✓] [✗]
    line = line.replace(/^[\u2610\u2611\u2713\u2717\u2612]\s*/, '')
    line = line.replace(/^\[[ xX✓✗]\]\s*/, '')

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
 * Format: one item per line, with quantity suffix if > 1.
 * Returns the number of items exported.
 */
export async function exportToClipboard(items: ShoppingItem[]): Promise<number> {
  if (items.length === 0) return 0

  const sorted = [...items].sort((a, b) => a.order - b.order)
  const lines = sorted.map((item) => {
    if (item.quantity > 1) return `${item.name} x${item.quantity}`
    return item.name
  })

  await Clipboard.setStringAsync(lines.join('\n'))
  return lines.length
}

/**
 * Import shopping list items from clipboard.
 * Parses the clipboard text, filters out items that already exist
 * (case-insensitive, diacritics-insensitive comparison).
 * Returns the names of added and skipped items.
 */
export async function importFromClipboard(
  existingItems: ShoppingItem[],
): Promise<{ added: string[]; skipped: string[]; empty: boolean }> {
  const text = await Clipboard.getStringAsync()

  if (!text || !text.trim()) {
    return { added: [], skipped: [], empty: true }
  }

  const parsed = parseListText(text)

  // Build set of existing item names (normalized)
  const existingNames = new Set(
    existingItems.map((item) => removeDiacritics(item.name).toLowerCase()),
  )

  const added: string[] = []
  const skipped: string[] = []

  for (const name of parsed) {
    const normalized = removeDiacritics(name).toLowerCase()
    if (existingNames.has(normalized)) {
      skipped.push(name)
    } else {
      added.push(name)
      existingNames.add(normalized)
    }
  }

  return { added, skipped, empty: false }
}
