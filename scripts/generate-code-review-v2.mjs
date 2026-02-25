import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType
} from 'docx'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputDir = path.join(__dirname, '..', 'code-reviews')

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, children: [new TextRun({ text, bold: true })] })
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, ...opts })]
  })
}

function boldPara(label, value) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: label, bold: true, size: 22 }),
      new TextRun({ text: value, size: 22 }),
    ]
  })
}

function bullet(text, opts = {}) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 22, ...opts })]
  })
}

function codePara(text) {
  return new Paragraph({
    spacing: { after: 80 },
    shading: { type: ShadingType.SOLID, color: 'F5F5F5' },
    children: [new TextRun({ text, font: 'Consolas', size: 18 })]
  })
}

function severityColor(severity) {
  switch (severity) {
    case 'CRITICAL': return 'CC0000'
    case 'HIGH': return 'FF6600'
    case 'MEDIUM': return 'FF9900'
    case 'LOW': return '999999'
    default: return '333333'
  }
}

function tableRow(cells, isHeader = false) {
  return new TableRow({
    children: cells.map(({ text, width, color }) =>
      new TableCell({
        width: { size: width || 2000, type: WidthType.DXA },
        shading: isHeader ? { type: ShadingType.SOLID, color: '4CAF50' } : undefined,
        children: [new Paragraph({
          children: [new TextRun({
            text,
            bold: isHeader,
            color: isHeader ? 'FFFFFF' : (color || '333333'),
            size: 20,
          })]
        })]
      })
    ),
  })
}

const doc = new Document({
  creator: 'Claude Code Review',
  title: '1GoShop - Code Review Report #2',
  description: 'Second code review of 1GoShop React Native application',
  sections: [{
    properties: {},
    children: [
      // ===== TITLE PAGE =====
      new Paragraph({ spacing: { before: 4000 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '1GoShop', size: 72, bold: true, color: '4CAF50' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: 'Code Review Report #2', size: 48, color: '666666' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Version 1.2.0 (Build #70)', size: 28, color: '999999' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: '25. februar 2026', size: 24, color: '999999' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Reviewer: Claude Code (AI-assisted)', size: 22, color: '999999', italics: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: 'Porovnanie s predchadzajucim review z 24. februara 2026', size: 20, color: '999999', italics: true })]
      }),
      new Paragraph({ pageBreakBefore: true }),

      // ===== 1. EXECUTIVE SUMMARY =====
      heading('1. Executive Summary'),
      para('Druhy code review aplikacie 1GoShop po implementacii bezpecnych oprav z prveho review (24. februar) a novych UX vylepseni (Build #70). Celkova kvalita kodu sa zlepsila. Z 12 problemov identifikovanych v prvom review bolo 7 opravenych.'),
      new Paragraph({ spacing: { after: 200 } }),

      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: 'Kategoria', width: 4000 },
            { text: 'Stav', width: 2500 },
            { text: 'Pocet', width: 2500 },
          ], true),
          tableRow([
            { text: 'Opravene z prveho review', width: 4000 },
            { text: 'FIXED', width: 2500, color: '4CAF50' },
            { text: '7', width: 2500 },
          ]),
          tableRow([
            { text: 'Pretrvavajuce z prveho review', width: 4000 },
            { text: 'OPEN', width: 2500, color: 'FF9900' },
            { text: '5', width: 2500 },
          ]),
          tableRow([
            { text: 'Nove nalezy', width: 4000 },
            { text: 'NEW', width: 2500, color: '2196F3' },
            { text: '3', width: 2500 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 2. STAV OPRAV Z PRVEHO REVIEW =====
      heading('2. Stav oprav z prveho review (24. februar 2026)'),

      // 2.1 OPRAVENE
      heading('2.1 OPRAVENE', HeadingLevel.HEADING_2),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: '#', width: 500 },
            { text: 'Problem', width: 4000 },
            { text: 'Zavaznost', width: 1500 },
            { text: 'Stav', width: 3000 },
          ], true),
          tableRow([
            { text: '1', width: 500 },
            { text: 'jsonwebtoken a node-pty v dependencies', width: 4000 },
            { text: 'CRITICAL', width: 1500, color: severityColor('CRITICAL') },
            { text: 'FIXED - Odstranene z package.json', width: 3000, color: '4CAF50' },
          ]),
          tableRow([
            { text: '2', width: 500 },
            { text: 'babel-preset-expo v production dependencies', width: 4000 },
            { text: 'MEDIUM', width: 1500, color: severityColor('MEDIUM') },
            { text: 'FIXED - Presunuty do devDependencies', width: 3000, color: '4CAF50' },
          ]),
          tableRow([
            { text: '3', width: 500 },
            { text: 'Nepouzity screenWidth v TutorialOverlay', width: 4000 },
            { text: 'LOW', width: 1500, color: severityColor('LOW') },
            { text: 'FIXED - Odstraneny import aj pouzitie', width: 3000, color: '4CAF50' },
          ]),
          tableRow([
            { text: '4', width: 500 },
            { text: 'Duplicitne trim() volania v ShoppingListScreen', width: 4000 },
            { text: 'MEDIUM', width: 1500, color: severityColor('MEDIUM') },
            { text: 'FIXED - Memoizovany trimmedFilter', width: 3000, color: '4CAF50' },
          ]),
          tableRow([
            { text: '5', width: 500 },
            { text: 'Array.sort() mutacia v ActiveShoppingStore', width: 4000 },
            { text: 'MEDIUM', width: 1500, color: severityColor('MEDIUM') },
            { text: 'FIXED - Pridany spread operator', width: 3000, color: '4CAF50' },
          ]),
          tableRow([
            { text: '6', width: 500 },
            { text: 'Tichy error handling (8 catch blokov)', width: 4000 },
            { text: 'MEDIUM', width: 1500, color: severityColor('MEDIUM') },
            { text: 'FIXED - Pridany console.warn do vsetkych', width: 3000, color: '4CAF50' },
          ]),
          tableRow([
            { text: '7', width: 500 },
            { text: 'Magic number screenWidth unused', width: 4000 },
            { text: 'LOW', width: 1500, color: severityColor('LOW') },
            { text: 'FIXED - Odstraneny spolu s useWindowDimensions import', width: 3000, color: '4CAF50' },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // 2.2 PRETRVAVAJUCE
      heading('2.2 PRETRVAVAJUCE', HeadingLevel.HEADING_2),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: '#', width: 500 },
            { text: 'Problem', width: 4000 },
            { text: 'Zavaznost', width: 1500 },
            { text: 'Stav', width: 3000 },
          ], true),
          tableRow([
            { text: '1', width: 500 },
            { text: 'TutorialOverlay.tsx - 1474 riadkov', width: 4000 },
            { text: 'HIGH', width: 1500, color: severityColor('HIGH') },
            { text: 'OPEN - Stale monoliticky komponent, duplicitne animacie IncrementAnimation/DecrementAnimation', width: 3000, color: 'FF9900' },
          ]),
          tableRow([
            { text: '2', width: 500 },
            { text: 'Store persistence duplicita', width: 4000 },
            { text: 'MEDIUM', width: 1500, color: severityColor('MEDIUM') },
            { text: 'OPEN - 3 story stale pouzivaju rovnaky pattern bez zdielanej utility', width: 3000, color: 'FF9900' },
          ]),
          tableRow([
            { text: '3', width: 500 },
            { text: 'Mixovanie animacnych API (Animated + Reanimated)', width: 4000 },
            { text: 'MEDIUM', width: 1500, color: severityColor('MEDIUM') },
            { text: 'OPEN - TutorialOverlay stale pouziva oba API sucasne', width: 3000, color: 'FF9900' },
          ]),
          tableRow([
            { text: '4', width: 500 },
            { text: 'reanimated-color-picker (4.4 MB)', width: 4000 },
            { text: 'LOW', width: 1500, color: severityColor('LOW') },
            { text: 'OPEN - Stale velka kniznica pre jednoduchy color picker', width: 3000, color: 'FF9900' },
          ]),
          tableRow([
            { text: '5', width: 500 },
            { text: 'Magicke cisla bez dokumentacie', width: 4000 },
            { text: 'LOW', width: 1500, color: severityColor('LOW') },
            { text: 'OPEN - SWIPE_THRESHOLD=30, TOTAL_STEPS=9, HSL hodnoty v ColorUtils.ts', width: 3000, color: 'FF9900' },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 3. NOVE NALEZY =====
      heading('3. Nove nalezy'),

      // 3.1
      heading('3.1 Novy tichy catch blok v App.tsx (MEDIUM)', HeadingLevel.HEADING_2),
      para('App.tsx riadok 52: initialize() funkcia ma catch blok bez console.warn, nekonzistentne s opravami v storoch.'),
      codePara('} catch { // Continue even if initialization partially fails }'),
      para('Odporucanie: Pridat console.warn ako v ostatnych storoch'),
      new Paragraph({ spacing: { after: 200 } }),

      // 3.2
      heading('3.2 Tichy catch blok v BackupService.ts (MEDIUM)', HeadingLevel.HEADING_2),
      para('BackupService.ts ma 2 tichy catch bloky:'),
      bullet('riadok 51: restoreFromFile() - catch { return false }'),
      bullet('riadok 70: restoreBackup() - catch { return false }'),
      para('Odporucanie: Pridat console.warn pre debugging'),
      new Paragraph({ spacing: { after: 200 } }),

      // 3.3
      heading('3.3 Inline styles v App.tsx (LOW)', HeadingLevel.HEADING_2),
      para('App.tsx pouziva inline styles na 2 miestach (riadky 24 a 32): style={{ flex: 1, ... }}. V ostatnych komponentoch sa pouziva StyleSheet z react-native-unistyles.'),
      para('Odporucanie: Extrahovat do StyleSheet.create() pre konzistenciu'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 4. ANALYZA ZAVISLOSTI =====
      heading('4. Analyza zavislosti'),

      heading('4.1 Statistiky', HeadingLevel.HEADING_2),
      boldPara('Production dependencies: ', '28 (znizenie z 31)'),
      boldPara('Dev dependencies: ', '7 (zvysenie z 5, babel-preset-expo premiestneny + docx pridany)'),
      boldPara('Velkost node_modules: ', '605 MB (znizenie z 663 MB, uspora 58 MB)'),
      new Paragraph({ spacing: { after: 200 } }),

      heading('4.2 Top 10 podla velkosti', HeadingLevel.HEADING_2),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: 'Zavislost', width: 4000 },
            { text: 'Velkost', width: 2500 },
            { text: 'Nutna?', width: 2500 },
          ], true),
          tableRow([{ text: 'react-native', width: 4000 }, { text: '84 MB', width: 2500 }, { text: 'ANO', width: 2500 }]),
          tableRow([{ text: 'expo', width: 4000 }, { text: '22 MB', width: 2500 }, { text: 'ANO', width: 2500 }]),
          tableRow([{ text: 'react-native-reanimated', width: 4000 }, { text: '7.3 MB', width: 2500 }, { text: 'ANO (animacie)', width: 2500 }]),
          tableRow([{ text: 'react-native-gesture-handler', width: 4000 }, { text: '5.9 MB', width: 2500 }, { text: 'ANO (gesta)', width: 2500 }]),
          tableRow([{ text: 'react-native-screens', width: 4000 }, { text: '4.5 MB', width: 2500 }, { text: 'ANO (navigacia)', width: 2500 }]),
          tableRow([{ text: 'reanimated-color-picker', width: 4000 }, { text: '4.4 MB', width: 2500 }, { text: 'ZVAZIT nahradit', width: 2500, color: 'FF9900' }]),
          tableRow([{ text: 'react-native-unistyles', width: 4000 }, { text: '3.6 MB', width: 2500 }, { text: 'ANO (theming)', width: 2500 }]),
          tableRow([{ text: 'react-native-worklets', width: 4000 }, { text: '1.6 MB', width: 2500 }, { text: 'ANO (reanimated dep)', width: 2500 }]),
          tableRow([{ text: 'react-i18next', width: 4000 }, { text: '1.1 MB', width: 2500 }, { text: 'ANO (i18n)', width: 2500 }]),
          tableRow([{ text: 'react-native-draggable-flatlist', width: 4000 }, { text: '854 KB', width: 2500 }, { text: 'ANO (drag&drop)', width: 2500 }]),
        ],
      }),
      new Paragraph({ spacing: { after: 200 } }),

      heading('4.3 Dev dependencies (nemaju vplyv na bundle)', HeadingLevel.HEADING_2),
      bullet('googleapis (171 MB) - len pre Google Play publish skript'),
      bullet('puppeteer (200+ MB) - len pre screenshot skripty'),
      bullet('sharp - len pre generovanie grafiky'),
      bullet('docx - len pre generovanie code review'),
      bullet('Odporucanie: Zvazit presun do samostatneho package.json v scripts/'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 5. ANALYZA I18N =====
      heading('5. Analyza i18n'),

      heading('5.1 Statistiky', HeadingLevel.HEADING_2),
      boldPara('Pocet jazykov: ', '12'),
      boldPara('Kluce v EN: ', '118'),
      boldPara('Celkova velkost locale suborov: ', '69 KB'),
      new Paragraph({ spacing: { after: 200 } }),

      heading('5.2 Konzistencia klucov', HeadingLevel.HEADING_2),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: 'Jazyk', width: 2000 },
            { text: 'Stav', width: 2500 },
            { text: 'Poznamka', width: 4500 },
          ], true),
          tableRow([{ text: 'sk.json', width: 2000 }, { text: 'OK + 2 extra', width: 2500 }, { text: 'itemCount_few, markedForShopping_few (spravne - slovanske pluraly)', width: 4500 }]),
          tableRow([{ text: 'cs.json', width: 2000 }, { text: 'OK + 2 extra', width: 2500 }, { text: 'rovnake _few kluce (spravne)', width: 4500 }]),
          tableRow([{ text: 'pl.json', width: 2000 }, { text: 'OK + 2 extra', width: 2500 }, { text: 'rovnake _few kluce (spravne)', width: 4500 }]),
          tableRow([{ text: 'uk.json', width: 2000 }, { text: 'OK + 2 extra', width: 2500 }, { text: 'rovnake _few kluce (spravne)', width: 4500 }]),
          tableRow([{ text: 'zh.json', width: 2000 }, { text: 'OK - 2 missing', width: 2500 }, { text: 'itemCount_one, markedForShopping_one (spravne - cinstina nema singular)', width: 4500 }]),
          tableRow([{ text: 'de.json', width: 2000 }, { text: 'OK', width: 2500 }, { text: 'Vsetky kluce zhodne', width: 4500 }]),
          tableRow([{ text: 'en.json', width: 2000 }, { text: 'zaklad', width: 2500 }, { text: '118 klucov', width: 4500 }]),
          tableRow([{ text: 'es.json', width: 2000 }, { text: 'OK', width: 2500 }, { text: 'Vsetky kluce zhodne', width: 4500 }]),
          tableRow([{ text: 'fr.json', width: 2000 }, { text: 'OK', width: 2500 }, { text: 'Vsetky kluce zhodne', width: 4500 }]),
          tableRow([{ text: 'hu.json', width: 2000 }, { text: 'OK', width: 2500 }, { text: 'Vsetky kluce zhodne', width: 4500 }]),
          tableRow([{ text: 'it.json', width: 2000 }, { text: 'OK', width: 2500 }, { text: 'Vsetky kluce zhodne', width: 4500 }]),
          tableRow([{ text: 'pt.json', width: 2000 }, { text: 'OK', width: 2500 }, { text: 'Vsetky kluce zhodne', width: 4500 }]),
        ],
      }),
      new Paragraph({ spacing: { after: 200 } }),
      para('Vsetky rozdiely v klucoch su ocakavane a suvisia s pluralizaciou v roznych jazykoch. Ziadne chybajuce preklady.'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 6. ANALYZA ASSETS =====
      heading('6. Analyza assets'),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: 'Subor', width: 3000 },
            { text: 'Velkost', width: 3000 },
            { text: 'Odporucanie', width: 3000 },
          ], true),
          tableRow([{ text: 'icon.png', width: 3000 }, { text: '760 KB', width: 3000 }, { text: 'OPTIMALIZOVAT - mal by byt 50-100 KB', width: 3000, color: 'FF9900' }]),
          tableRow([{ text: 'adaptive-icon.png', width: 3000 }, { text: '760 KB', width: 3000 }, { text: 'OPTIMALIZOVAT - mal by byt 50-100 KB', width: 3000, color: 'FF9900' }]),
          tableRow([{ text: 'splash-icon.png', width: 3000 }, { text: '64 KB', width: 3000 }, { text: 'OK', width: 3000 }]),
          tableRow([{ text: 'favicon.png', width: 3000 }, { text: '8 KB', width: 3000 }, { text: 'OK', width: 3000 }]),
          tableRow([{ text: 'CELKOM', width: 3000 }, { text: '1.6 MB', width: 3000 }, { text: 'Potencialny uspora 1.2 MB optimalizaciou ikon', width: 3000 }]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 7. STRUKTURA ZDROJOVEHO KODU =====
      heading('7. Struktura zdrojoveho kodu'),

      heading('7.1 Subory podla velkosti', HeadingLevel.HEADING_2),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: 'Subor', width: 4000 },
            { text: 'Riadky', width: 1500 },
            { text: 'Poznamka', width: 3500 },
          ], true),
          tableRow([{ text: 'TutorialOverlay.tsx', width: 4000 }, { text: '1474', width: 1500 }, { text: 'Monoliticky - zvazit rozdelenie', width: 3500, color: 'FF6600' }]),
          tableRow([{ text: 'ShoppingListItem.tsx', width: 4000 }, { text: '376', width: 1500 }, { text: 'OK - obsahuje gestovu logiku', width: 3500 }]),
          tableRow([{ text: 'ColorPickerScreen.tsx', width: 4000 }, { text: '318', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'ShoppingHistoryScreen.tsx', width: 4000 }, { text: '309', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'SettingsScreen.tsx', width: 4000 }, { text: '294', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'ShoppingListScreen.tsx', width: 4000 }, { text: '281', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'ActiveShoppingScreen.tsx', width: 4000 }, { text: '184', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'ShoppingListStore.ts', width: 4000 }, { text: '150', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'AccentColorStore.ts', width: 4000 }, { text: '149', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'ListClipboardService.ts', width: 4000 }, { text: '140', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'ActiveShoppingStore.ts', width: 4000 }, { text: '139', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'ColorUtils.ts', width: 4000 }, { text: '111', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'AddItemInput.tsx', width: 4000 }, { text: '110', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'unistyles.ts', width: 4000 }, { text: '98', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'ActiveShoppingItem.tsx', width: 4000 }, { text: '98', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'BackupService.ts', width: 4000 }, { text: '73', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'AppNavigator.tsx', width: 4000 }, { text: '73', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'App.tsx', width: 4000 }, { text: '57', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'ThemeStore.ts', width: 4000 }, { text: '56', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'i18n.ts', width: 4000 }, { text: '50', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'EmptyListPlaceholder.tsx', width: 4000 }, { text: '42', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'shopping.ts', width: 4000 }, { text: '24', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'expo-vector-icons.d.ts', width: 4000 }, { text: '17', width: 1500 }, { text: 'OK', width: 3500 }]),
          tableRow([{ text: 'index.ts', width: 4000 }, { text: '5', width: 1500 }, { text: 'OK', width: 3500 }]),
        ],
      }),
      new Paragraph({ spacing: { after: 200 } }),
      boldPara('Celkovy pocet zdrojovych riadkov: ', '~4,326'),
      new Paragraph({ spacing: { after: 200 } }),

      heading('7.2 Pozitivne zmeny od prveho review', HeadingLevel.HEADING_2),
      bullet('node_modules znizeny o 58 MB (663 -> 605 MB)'),
      bullet('Production dependencies znizene z 31 na 28'),
      bullet('Vsetky catch bloky v storoch maju console.warn'),
      bullet('Ziadne nepouzite dependencies'),
      bullet('Korektna immutabilita v ActiveShoppingStore'),
      bullet('Memoizovany filter v ShoppingListScreen'),
      bullet('Nove UX: uncheck po nakupe, decrement-to-delete, long press edit'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 8. ODPORUCANIA =====
      heading('8. Odporucania na dalsie vylepsenia (prioritizovane)'),

      heading('Priorita 1 - Quick wins', HeadingLevel.HEADING_2),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: '#', width: 500 },
            { text: 'Akcia', width: 5000 },
            { text: 'Dopad', width: 3500 },
          ], true),
          tableRow([
            { text: '1', width: 500 },
            { text: 'Pridat console.warn do App.tsx catch bloku', width: 5000 },
            { text: 'Konzistencia', width: 3500 },
          ]),
          tableRow([
            { text: '2', width: 500 },
            { text: 'Pridat console.warn do BackupService.ts catch blokov', width: 5000 },
            { text: 'Debugging', width: 3500 },
          ]),
          tableRow([
            { text: '3', width: 500 },
            { text: 'Optimalizovat icon.png a adaptive-icon.png (TinyPNG)', width: 5000 },
            { text: '-1.2 MB assets', width: 3500 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 300 } }),

      heading('Priorita 2 - Stredne narocne', HeadingLevel.HEADING_2),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: '#', width: 500 },
            { text: 'Akcia', width: 5000 },
            { text: 'Dopad', width: 3500 },
          ], true),
          tableRow([
            { text: '4', width: 500 },
            { text: 'Extrahovat store persistence utilitu', width: 5000 },
            { text: 'Reducia duplicity', width: 3500 },
          ]),
          tableRow([
            { text: '5', width: 500 },
            { text: 'Zlucit IncrementAnimation/DecrementAnimation v TutorialOverlay', width: 5000 },
            { text: '-100 riadkov', width: 3500 },
          ]),
          tableRow([
            { text: '6', width: 500 },
            { text: 'Extrahovat theme update logiku v AccentColorStore', width: 5000 },
            { text: 'Reducia duplicity', width: 3500 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 300 } }),

      heading('Priorita 3 - Dlhodoba', HeadingLevel.HEADING_2),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: '#', width: 500 },
            { text: 'Akcia', width: 5000 },
            { text: 'Dopad', width: 3500 },
          ], true),
          tableRow([
            { text: '7', width: 500 },
            { text: 'Rozdelit TutorialOverlay do viacerych suborov', width: 5000 },
            { text: 'Udrzovatelnost', width: 3500 },
          ]),
          tableRow([
            { text: '8', width: 500 },
            { text: 'Zvazit nahradenie reanimated-color-picker', width: 5000 },
            { text: '-4.4 MB', width: 3500 },
          ]),
          tableRow([
            { text: '9', width: 500 },
            { text: 'Presunnut build skripty do samostatneho package.json', width: 5000 },
            { text: 'Rychlejsi npm install', width: 3500 },
          ]),
          tableRow([
            { text: '10', width: 500 },
            { text: 'Zjednotit animacne API v TutorialOverlay na Reanimated', width: 5000 },
            { text: 'Konzistencia', width: 3500 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 9. CELKOVE HODNOTENIE =====
      heading('9. Celkove hodnotenie'),
      para('Kvalita kodu sa od prveho review zlepsula. 7 zo 12 identifikovanych problemov bolo opravenych, vsetky opravy boli bezpecne a nezmenili spravanie aplikacie. Nove UX vylepsenia (uncheck po nakupe, decrement-to-delete, long press edit) su implementovane ciste a konzistentne s existujucim kodom.'),
      new Paragraph({ spacing: { after: 200 } }),

      boldPara('Celkove hodnotenie: ', 'GOOD (zlepsenie z NEEDS CHANGES)'),
      new Paragraph({ spacing: { after: 200 } }),

      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: 'Metrika', width: 2500 },
            { text: 'Review #1 (24.2.)', width: 2000 },
            { text: 'Review #2 (25.2.)', width: 2000 },
            { text: 'Zmena', width: 2500 },
          ], true),
          tableRow([
            { text: 'Production deps', width: 2500 },
            { text: '31', width: 2000 },
            { text: '28', width: 2000 },
            { text: '-3', width: 2500 },
          ]),
          tableRow([
            { text: 'node_modules', width: 2500 },
            { text: '663 MB', width: 2000 },
            { text: '605 MB', width: 2000 },
            { text: '-58 MB', width: 2500 },
          ]),
          tableRow([
            { text: 'Tichy error handling', width: 2500 },
            { text: '8 miest', width: 2000 },
            { text: '3 miesta', width: 2000 },
            { text: '-5', width: 2500 },
          ]),
          tableRow([
            { text: 'Nepouzite deps', width: 2500 },
            { text: '2 (CRITICAL)', width: 2000, color: severityColor('CRITICAL') },
            { text: '0', width: 2000 },
            { text: 'Opravene', width: 2500, color: '4CAF50' },
          ]),
          tableRow([
            { text: 'Celkove hodnotenie', width: 2500 },
            { text: 'NEEDS CHANGES', width: 2000, color: 'FF9900' },
            { text: 'GOOD', width: 2000, color: '4CAF50' },
            { text: 'Zlepsenie', width: 2500, color: '4CAF50' },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '--- Koniec reportu ---', size: 20, color: '999999', italics: true })]
      }),
    ],
  }],
})

const buffer = await Packer.toBuffer(doc)
const outputPath = path.join(outputDir, '2026-02-25-code-review-v1.2.0-b70.docx')
fs.writeFileSync(outputPath, buffer)
console.log(`Code review document saved to: ${outputPath}`)
