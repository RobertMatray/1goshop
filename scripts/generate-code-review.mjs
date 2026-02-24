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
  title: '1GoShop - Code Review Report',
  description: 'Comprehensive code review of 1GoShop React Native application',
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
        children: [new TextRun({ text: 'Code Review Report', size: 48, color: '666666' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Version 1.2.0', size: 28, color: '999999' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: '24. februar 2026', size: 24, color: '999999' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Reviewer: Claude Code (AI-assisted)', size: 22, color: '999999', italics: true })]
      }),
      new Paragraph({ pageBreakBefore: true }),

      // ===== EXECUTIVE SUMMARY =====
      heading('1. Executive Summary'),
      para('1GoShop je React Native / Expo shopping list aplikacia s 12 jazykmi, lokalnymi datami (AsyncStorage) a gestovym ovladanim. Cielom tohto code review je identifikovat problemy, ktore sposobuju zbytocne velku velkost aplikacie, najst anti-patterny a navrnut refaktoring.'),
      new Paragraph({ spacing: { after: 200 } }),

      boldPara('Celkove hodnotenie: ', 'Kod je kvalitny s dobrou architekturou, ale obsahuje zbytocne zavislosti a duplicitny kod, ktory zvacsuje velkost aplikacie a znizuje udrzovatelnost.'),
      new Paragraph({ spacing: { after: 200 } }),

      // Summary table
      heading('Prehlad nalezov', HeadingLevel.HEADING_2),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: 'Kategoria', width: 3000 },
            { text: 'Zavaznost', width: 2000 },
            { text: 'Pocet', width: 1500 },
            { text: 'Dopad', width: 2500 },
          ], true),
          tableRow([
            { text: 'Zbytocne zavislosti', width: 3000 },
            { text: 'CRITICAL', width: 2000, color: 'CC0000' },
            { text: '5', width: 1500 },
            { text: 'Bundle bloat, bezpecnost', width: 2500 },
          ]),
          tableRow([
            { text: 'Duplicita kodu', width: 3000 },
            { text: 'HIGH', width: 2000, color: 'FF6600' },
            { text: '3 patterny', width: 1500 },
            { text: 'Udrzovatelnost', width: 2500 },
          ]),
          tableRow([
            { text: 'Vykonnostne problemy', width: 3000 },
            { text: 'MEDIUM', width: 2000, color: 'FF9900' },
            { text: '3', width: 1500 },
            { text: 'Runtime cost', width: 2500 },
          ]),
          tableRow([
            { text: 'Tichy error handling', width: 3000 },
            { text: 'MEDIUM', width: 2000, color: 'FF9900' },
            { text: '6 miest', width: 1500 },
            { text: 'Debugging', width: 2500 },
          ]),
          tableRow([
            { text: 'Magicke cisla', width: 3000 },
            { text: 'LOW', width: 2000, color: '999999' },
            { text: '4', width: 1500 },
            { text: 'Citatelnost', width: 2500 },
          ]),
          tableRow([
            { text: 'Type safety', width: 3000 },
            { text: 'LOW', width: 2000, color: '999999' },
            { text: '2', width: 1500 },
            { text: 'Robustnost', width: 2500 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== SECTION 2: DEPENDENCIES =====
      heading('2. Analyza zavislosti (CRITICAL)'),
      para('Aplikacia obsahuje 31 production dependencies a 5 dev dependencies. Niekolko z nich nema v shopping list aplikacii ziadne opodstatnenie.'),

      heading('2.1 Zbytocne production dependencies', HeadingLevel.HEADING_3),

      boldPara('jsonwebtoken (^9.0.3)', ' - JWT kniznica'),
      bullet('Pouzitie v kode: ZIADNE - nikde v src/ sa nepouziva'),
      bullet('Dovod: Pravdepodobne skopirovane z ineho projektu (superapp-ai-poc)'),
      bullet('Dopad: Zbytocne zvacuje bundle, pridava kryptograficke zavislosti'),
      bullet('Odporucanie: ODSTRANIT OKAMZITE', { color: 'CC0000' }),

      boldPara('node-pty (^1.1.0)', ' - Terminalovy emulator (64 MB v node_modules!)'),
      bullet('Pouzitie v kode: ZIADNE - nikde v src/ sa nepouziva'),
      bullet('Dovod: Pravdepodobne omylom pridane'),
      bullet('Dopad: 64 MB v node_modules, nativne C++ bindinge, spomaluje npm install'),
      bullet('Odporucanie: ODSTRANIT OKAMZITE', { color: 'CC0000' }),

      heading('2.2 Zbytocne dev dependencies', HeadingLevel.HEADING_3),

      boldPara('googleapis (^171.4.0)', ' - Google APIs klient'),
      bullet('Pouzitie: Len v scripts/publish-google-play.mjs (build skript)'),
      bullet('Problem: Velmi velka kniznica (desiatky MB), spomaluje npm install'),
      bullet('Odporucanie: Presunout do samostatneho package.json v scripts/ alebo pouzit priamo googleapis REST API cez fetch'),

      boldPara('puppeteer (^24.37.4)', ' - Browser automatizacia'),
      bullet('Pouzitie: Len v screenshot skriptoch'),
      bullet('Problem: 200+ MB, stiahne Chromium browser'),
      bullet('Odporucanie: Presunut do samostatneho package.json alebo odstranit ak sa nepouziva'),

      boldPara('sharp (^0.34.5)', ' - Obrazkova kniznica'),
      bullet('Pouzitie: Len na generovanie Google Play grafiky'),
      bullet('Odporucanie: Presunut do samostatneho package.json'),

      heading('2.3 Velkostna analyza zavislosti', HeadingLevel.HEADING_3),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: 'Zavislost', width: 4000 },
            { text: 'Velkost (node_modules)', width: 2500 },
            { text: 'Nutna?', width: 2500 },
          ], true),
          tableRow([{ text: 'react-native', width: 4000 }, { text: '84 MB', width: 2500 }, { text: 'ANO', width: 2500 }]),
          tableRow([{ text: 'node-pty', width: 4000 }, { text: '64 MB', width: 2500 }, { text: 'NIE - ODSTRANIT', width: 2500, color: 'CC0000' }]),
          tableRow([{ text: 'expo', width: 4000 }, { text: '22 MB', width: 2500 }, { text: 'ANO', width: 2500 }]),
          tableRow([{ text: 'react-native-reanimated', width: 4000 }, { text: '7.3 MB', width: 2500 }, { text: 'ANO (animacie)', width: 2500 }]),
          tableRow([{ text: '@expo/vector-icons', width: 4000 }, { text: '6.2 MB', width: 2500 }, { text: 'ANO (ikony)', width: 2500 }]),
          tableRow([{ text: 'react-native-gesture-handler', width: 4000 }, { text: '5.9 MB', width: 2500 }, { text: 'ANO (gesta)', width: 2500 }]),
          tableRow([{ text: 'react-native-screens', width: 4000 }, { text: '4.5 MB', width: 2500 }, { text: 'ANO (navigacia)', width: 2500 }]),
          tableRow([{ text: 'reanimated-color-picker', width: 4000 }, { text: '4.4 MB', width: 2500 }, { text: 'ZVAZIT nahradit', width: 2500, color: 'FF9900' }]),
          tableRow([{ text: 'react-native-unistyles', width: 4000 }, { text: '3.6 MB', width: 2500 }, { text: 'ANO (theming)', width: 2500 }]),
          tableRow([{ text: 'react-native-worklets', width: 4000 }, { text: '1.6 MB', width: 2500 }, { text: 'ANO (reanimated dep)', width: 2500 }]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== SECTION 3: CODE DUPLICATION =====
      heading('3. Duplicita kodu (HIGH)'),

      heading('3.1 Animacny kod v TutorialOverlay.tsx (1476 riadkov)', HeadingLevel.HEADING_3),
      para('TutorialOverlay.tsx je najvacsi subor v projekte s 1476 riadkami. Obsahuje 9 animacnych komponentov, z ktorych IncrementAnimation a DecrementAnimation su takmer identicke (~100 riadkov duplicitneho kodu).'),
      bullet('Subor: src/screens/ShoppingListScreen/components/TutorialOverlay.tsx'),
      bullet('Problem: IncrementAnimation (riadky 525-621) a DecrementAnimation (riadky 627-723) sa lisia len v 3 premennych'),
      bullet('Odporucanie: Extrahovat do parametrickej funkcie QuantityAnimation({ direction, initialQty })'),

      heading('3.2 Store persistence pattern', HeadingLevel.HEADING_3),
      para('Vsetky 3 Zustand story (ShoppingListStore, ActiveShoppingStore, AccentColorStore) pouzivaju identicky pattern pre persistenciu dat:'),
      codePara('function persist(items: T[]): void {'),
      codePara('  AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => {})'),
      codePara('}'),
      bullet('Odporucanie: Vytvorit genericku utilitu persistToStorage<T>(key: string, data: T) v src/utils/storage.ts'),

      heading('3.3 Theme update duplicita v AccentColorStore', HeadingLevel.HEADING_3),
      para('Funkcie applyAccentColor() a resetToDefaultColors() obsahuju duplicitnu logiku pre aktualizaciu light a dark temy.'),
      bullet('Odporucanie: Extrahovat do updateBothThemes(colorSource) funkcie'),

      // ===== SECTION 4: PERFORMANCE =====
      heading('4. Vykonnostne problemy (MEDIUM)'),

      heading('4.1 Zbytocne sortovanie v ShoppingListScreen', HeadingLevel.HEADING_3),
      para('ShoppingListScreen.tsx, riadky 31-33:'),
      codePara('const sortedItems = useMemo(() => {'),
      codePara('  return [...items].sort((a, b) => a.order - b.order)'),
      codePara('}, [items])'),
      para('Problem: Polozky su uz zoradene podla order fieldu v store (reindexovane pri nacitani). Sortovanie je redundantne a vytvara zbytocnu kopiu pola.'),
      bullet('Odporucanie: Odstranit sort, pouzit items priamo'),

      heading('4.2 Duplicitne volanie trim() pri filtrovani', HeadingLevel.HEADING_3),
      para('filterText.trim() sa vola 2x - pri vypocte isFiltering a pri samotnom filtrovani.'),
      bullet('Odporucanie: Memoizovat trimmedFilter = useMemo(() => filterText.trim(), [filterText])'),

      heading('4.3 Mutacia history pola', HeadingLevel.HEADING_3),
      para('ActiveShoppingStore.ts, riadok 50: Array.sort() mutuje povodne pole. Pouzit .slice().sort() alebo [...arr].sort().'),

      // ===== SECTION 5: ANTI-PATTERNS =====
      heading('5. Anti-patterny a code smells'),

      heading('5.1 Tichy error handling (6 miest)', HeadingLevel.HEADING_3),
      para('Na 6 miestach v kode su catch bloky, ktore ticho ignoruju chyby bez akehokolvek logu:'),
      bullet('ShoppingListStore.ts, riadok 42: catch {} - nacitanie dat'),
      bullet('ShoppingListStore.ts, riadok 138: .catch(() => {}) - persistencia'),
      bullet('ActiveShoppingStore.ts, riadok 52: catch {} - nacitanie historie'),
      bullet('ActiveShoppingStore.ts, riadky 136-138: .catch(() => {}) - persistencia'),
      bullet('AccentColorStore.ts, riadok 54: catch {} - nacitanie farieb'),
      bullet('AccentColorStore.ts, riadok 97: void AsyncStorage.setItem() - bez catch'),
      para('Dopad: Ak zlyhaju operacie s AsyncStorage (plny disk, corrupted data), pouzivatel sa to nikdy nedozvie a debugging je nemozny.'),
      bullet('Odporucanie: Pridat minimalne console.warn() do kazdeho catch bloku'),

      heading('5.2 Mixy animacnych API', HeadingLevel.HEADING_3),
      para('TutorialOverlay pouziva SOUCASNE React Native Animated (stary API) aj react-native-reanimated (novy API). To znacne komplikuje udrzbu kodu.'),
      bullet('TouchIndicator komponent: pouziva React Native Animated'),
      bullet('StepAnimation komponenty: pouzivaju Reanimated'),
      bullet('Odporucanie: Zjednotit na Reanimated pre vsetky animacie'),

      heading('5.3 Magicke cisla', HeadingLevel.HEADING_3),
      bullet('SWIPE_THRESHOLD = 30 (ShoppingListItem.tsx:24) - preco prave 30px?'),
      bullet('TOTAL_STEPS = 9 (TutorialOverlay.tsx:24) - hardcoded, malo by byt steps.length'),
      bullet('HSL hodnoty v ColorUtils.ts (riadky 99-108) - lightness 49%, 39%, 74%, 93% bez vysvetlenia'),
      bullet('Odporucanie: Zdokumentovat dovod kazdeho magickeho cisla alebo extrahovat do pomenovanej konstanty'),

      heading('5.4 Nepouzity import', HeadingLevel.HEADING_3),
      para('TutorialOverlay.tsx: screenWidth z useWindowDimensions() sa nikde v komponente nepouziva.'),

      // ===== SECTION 6: ARCHITECTURE =====
      heading('6. Architektonicke postrehy'),

      heading('6.1 TutorialOverlay - monoliticky komponent', HeadingLevel.HEADING_3),
      para('Subor TutorialOverlay.tsx ma 1476 riadkov - to je privelke pre jeden komponent. Obsahuje 9 animacnych komponentov, kazdy s vlastnou logikou.'),
      bullet('Odporucanie: Rozdelit do src/screens/ShoppingListScreen/components/tutorial/ priecinka s 9 samostatnymi subormi pre kazdy step'),
      bullet('Potencialny efekt: Lepsie lazy loading, lepsie testovanie, znizenie kognitivnej zlozitosti'),

      heading('6.2 reanimated-color-picker (4.4 MB)', HeadingLevel.HEADING_3),
      para('Pre jednoduchy HSL color picker je 4.4 MB kniznica pomerne velka. Zvazit:'),
      bullet('Vlastny jednoduchsi color picker (len HSL slider) - cca 100 riadkov kodu'),
      bullet('Alebo ponechat ak sa planuju dalsie color funkcie'),

      heading('6.3 babel-preset-expo v dependencies', HeadingLevel.HEADING_3),
      para('babel-preset-expo je v production dependencies namiesto devDependencies. Technicky to nema vplyv na bundle (Expo ho pouziva pri builde), ale je to zla prax.'),
      bullet('Odporucanie: Presunnut do devDependencies'),

      // ===== SECTION 7: POSITIVE =====
      heading('7. Pozitivne nalezy'),
      bullet('Kvalitna struktura navigacie - cisty React Navigation setup'),
      bullet('Dobre rozdelenie komponentov podla screens'),
      bullet('TypeScript strict mode - zapnuty a vynucovany'),
      bullet('Silny state management - Zustand story su ciste a fokusovane'),
      bullet('Kvalitny theme system - Unistyles integracia je dobre urobena'),
      bullet('12 jazykov s korektnou pluralizaciou (3 formy pre SK/CS/PL)'),
      bullet('Pokrocile gesta s haptickou spatenou vazbou'),
      bullet('Pristupnost - 44px+ touch targety, haptic feedback'),
      bullet('Ziadne memory leaky - spravny cleanup v useEffect hookoch'),
      bullet('Aplikacia necrashne pri zlyhani inicializacie'),

      // ===== SECTION 8: RECOMMENDATIONS =====
      heading('8. Odporucania na refaktoring (prioritizovane)'),

      heading('Priorita 1 - Okamzite (Quick wins)', HeadingLevel.HEADING_2),
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
            { text: 'Odstranit jsonwebtoken a node-pty z dependencies', width: 5000 },
            { text: 'Bundle size, bezpecnost', width: 3500 },
          ]),
          tableRow([
            { text: '2', width: 500 },
            { text: 'Odstranit redundantne sortovanie v ShoppingListScreen', width: 5000 },
            { text: 'Vykon', width: 3500 },
          ]),
          tableRow([
            { text: '3', width: 500 },
            { text: 'Pridat console.warn do vsetkych catch blokov', width: 5000 },
            { text: 'Debugovatelnost', width: 3500 },
          ]),
          tableRow([
            { text: '4', width: 500 },
            { text: 'Odstranit nepouzity import screenWidth', width: 5000 },
            { text: 'Cistota kodu', width: 3500 },
          ]),
          tableRow([
            { text: '5', width: 500 },
            { text: 'Presunnut babel-preset-expo do devDependencies', width: 5000 },
            { text: 'Spravna kategorizacia', width: 3500 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 300 } }),

      heading('Priorita 2 - Kratkodoba (Refaktoring)', HeadingLevel.HEADING_2),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: '#', width: 500 },
            { text: 'Akcia', width: 5000 },
            { text: 'Dopad', width: 3500 },
          ], true),
          tableRow([
            { text: '6', width: 500 },
            { text: 'Extrahovat store persistence utilitu', width: 5000 },
            { text: 'Reducia duplicity', width: 3500 },
          ]),
          tableRow([
            { text: '7', width: 500 },
            { text: 'Zlucit IncrementAnimation/DecrementAnimation', width: 5000 },
            { text: '-100 riadkov kodu', width: 3500 },
          ]),
          tableRow([
            { text: '8', width: 500 },
            { text: 'Extrahovat theme update logiku v AccentColorStore', width: 5000 },
            { text: 'Reducia duplicity', width: 3500 },
          ]),
          tableRow([
            { text: '9', width: 500 },
            { text: 'Rozdelit TutorialOverlay na mensie subory', width: 5000 },
            { text: 'Udrzovatelnost, lazy loading', width: 3500 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 300 } }),

      heading('Priorita 3 - Dlhodoba (Optimalizacia)', HeadingLevel.HEADING_2),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: '#', width: 500 },
            { text: 'Akcia', width: 5000 },
            { text: 'Dopad', width: 3500 },
          ], true),
          tableRow([
            { text: '10', width: 500 },
            { text: 'Presunnut build skripty (googleapis, puppeteer, sharp) do samostatneho package.json', width: 5000 },
            { text: 'Rychlejsi npm install', width: 3500 },
          ]),
          tableRow([
            { text: '11', width: 500 },
            { text: 'Zvazit nahradenie reanimated-color-picker vlastnym riesenim', width: 5000 },
            { text: '-4.4 MB', width: 3500 },
          ]),
          tableRow([
            { text: '12', width: 500 },
            { text: 'Zjednotit animacne API na Reanimated', width: 5000 },
            { text: 'Konzistencia kodu', width: 3500 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== SECTION 9: STATS =====
      heading('9. Statistiky projektu'),
      boldPara('Celkovy pocet zdrojovych riadkov: ', '~2,350 (src/)'),
      boldPara('Najvacsi subor: ', 'TutorialOverlay.tsx - 1,476 riadkov'),
      boldPara('Pocet production dependencies: ', '31'),
      boldPara('Pocet dev dependencies: ', '5 (+1 docx)'),
      boldPara('Velkost node_modules: ', '663 MB'),
      boldPara('Velkost AAB (Android): ', '19.1 MB (download), 58.6 MB (subor)'),
      boldPara('Pocet jazykov: ', '12 (SK, EN, DE, HU, UK, CS, ZH, ES, FR, IT, PL, PT)'),
      boldPara('Pocet prekladovych klucov: ', '~135 per jazyk'),

      new Paragraph({ spacing: { after: 400 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '--- Koniec reportu ---', size: 20, color: '999999', italics: true })]
      }),
    ],
  }],
})

const buffer = await Packer.toBuffer(doc)
const outputPath = path.join(outputDir, '2026-02-24-code-review-v1.2.0.docx')
fs.writeFileSync(outputPath, buffer)
console.log(`Code review document saved to: ${outputPath}`)
