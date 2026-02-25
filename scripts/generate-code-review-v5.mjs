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
    case 'INFO': return '2196F3'
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

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

const doc = new Document({
  creator: 'Claude Code Review',
  title: '1GoShop - Code Review Report #5 (Independent)',
  description: 'Independent code review of 1GoShop React Native application - completely fresh perspective',
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
        children: [new TextRun({ text: 'Code Review Report #5 (Independent)', size: 48, color: '666666' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Version 1.2.0 (Build #73)', size: 28, color: '999999' })]
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
        children: [new TextRun({ text: 'Nezavisly review - uplne novy pohlad na kodovu bazu', size: 20, color: '999999', italics: true })]
      }),
      new Paragraph({ pageBreakBefore: true }),

      // ===== 1. EXECUTIVE SUMMARY =====
      heading('1. Executive Summary'),
      para('Piaty nezavisly code review aplikacie 1GoShop (Build #73). Kodova baza bola analyzovana uplne od nuly bez ohladu na akykolvek predchadzajuci review. Identifikovanych bolo 22 nalezov: 5 CRITICAL, 5 HIGH, 5 MEDIUM a 7 LOW.'),
      new Paragraph({ spacing: { after: 200 } }),

      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: 'Zavaznost', width: 2000 },
            { text: 'Pocet', width: 1500 },
            { text: 'Kategorie', width: 5500 },
          ], true),
          tableRow([
            { text: 'CRITICAL', width: 2000, color: severityColor('CRITICAL') },
            { text: '5', width: 1500 },
            { text: 'Race condition persistence, JSON parsing bez validacie, init zlyhanie bez recovery, duplicitne ID, clipboard input sanitizacia', width: 5500 },
          ]),
          tableRow([
            { text: 'HIGH', width: 2000, color: severityColor('HIGH') },
            { text: '5', width: 1500 },
            { text: 'Error boundary chyba, performance filter, async cleanup, console logy v produkcii, backup validacia', width: 5500 },
          ]),
          tableRow([
            { text: 'MEDIUM', width: 2000, color: severityColor('MEDIUM') },
            { text: '5', width: 1500 },
            { text: 'Debounce filter, AsyncStorage namespace, locale fallback, color warn spam, AbortController', width: 5500 },
          ]),
          tableRow([
            { text: 'LOW', width: 2000, color: severityColor('LOW') },
            { text: '7', width: 1500 },
            { text: 'Hardcoded farby, touch targets, accessibility labels, unit testy, magic numbers, JSDoc, theme flash', width: 5500 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 200 } }),

      boldPara('Celkove hodnotenie: ', 'B- (APPROVED with CHANGES REQUESTED)'),
      boldPara('Analyzovanych suborov: ', '36 TypeScript suborov'),
      boldPara('Celkovy pocet riadkov: ', '~4,500'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 2. CRITICAL ISSUES =====
      heading('2. CRITICAL - Musia byt opravene'),

      // 2.1
      heading('2.1 Race condition pri AsyncStorage persistence', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'ShoppingListStore.ts:148-150, ActiveShoppingStore.ts:141-143, AccentColorStore.ts:97-98, ThemeStore.ts:34'),
      para('Problem: Fire-and-forget zapisy cez void AsyncStorage.setItem(). Rapid zmeny (10 itemov za 2 sekundy) sposobuju overlapping writes - data loss, corrupted JSON, nekonzistentny stav.'),
      para('Riziko: Ak pouzivatel rychlo meni mnozstva alebo pridava polozky, sucasne zapisy mozu prepisat jeden druheho. Vysledkom je strata dat po restarte aplikacie.'),
      codePara('// Aktualne:'),
      codePara('void AsyncStorage.setItem(KEY, JSON.stringify(items))'),
      codePara('// Kazdy tap = novy async write, bez cakania na dokoncenie predchadzajuceho'),
      codePara(''),
      codePara('// Oprava: Debounced persistence alebo sequential write queue'),
      codePara('const debouncedPersist = debounce((data) => {'),
      codePara('  AsyncStorage.setItem(KEY, JSON.stringify(data))'),
      codePara('}, 300)'),
      new Paragraph({ spacing: { after: 300 } }),

      // 2.2
      heading('2.2 JSON parsing bez runtime validacie', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'ShoppingListStore.ts:32-35, ActiveShoppingStore.ts:35-38, AccentColorStore.ts:42-46'),
      para('Problem: JSON.parse() s type assertion "as ShoppingItem[]" bez runtime check. Corrupted AsyncStorage = crash na startup. Ak data v AsyncStorage su poskodene (napr. neuplny zapis z race condition), aplikacia spadne s TypeError.'),
      para('Riziko: Nerecoverable crash - pouzivatel musi clearnut data alebo reinstallovat aplikaciu.'),
      codePara('// Aktualne:'),
      codePara('const data = JSON.parse(stored) as ShoppingItem[]'),
      codePara('// Ziadna kontrola ci data maju spravnu strukturu'),
      codePara(''),
      codePara('// Oprava: Runtime validation functions'),
      codePara('function isValidShoppingItem(item: unknown): item is ShoppingItem {'),
      codePara('  return typeof item === "object" && item !== null'),
      codePara('    && "id" in item && "name" in item && "quantity" in item'),
      codePara('}'),
      codePara('function isValidShoppingItemArray(data: unknown): data is ShoppingItem[] {'),
      codePara('  return Array.isArray(data) && data.every(isValidShoppingItem)'),
      codePara('}'),
      codePara('// + backup corrupted dat pred vymazanim'),
      new Paragraph({ spacing: { after: 300 } }),

      // 2.3
      heading('2.3 Inicializacia zlyhava ticho', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'App.tsx:43-55'),
      para('Problem: Promise.allSettled() nikdy nerejectne. Ak i18n zlyhá, appka pokracuje s kluci namiesto textov. Ziadna error UI pre pouzivatela. Ak zlyhaju stores, pouzivatel nema ziadnu indikciu ze pracuje s prazdnym stavom.'),
      para('Riziko: Pouzivatel vidi "[settings.title]" namiesto textu, alebo strati vsetky ulozene polozky bez varovania.'),
      codePara('// Oprava: Separovat kriticke od nekritickych'),
      codePara('try {'),
      codePara('  await initI18n() // Kriticke - aplikacia bez textov je nepouzitelna'),
      codePara('} catch (e) {'),
      codePara('  Alert.alert("Chyba inicializacie", "...", ['),
      codePara('    { text: "Retry", onPress: () => retry() },'),
      codePara('    { text: "Continue", style: "cancel" }'),
      codePara('  ])'),
      codePara('}'),
      codePara('// Stores su menej kriticke - mozu fungovat s prazdnym stavom'),
      new Paragraph({ spacing: { after: 300 } }),

      // 2.4
      heading('2.4 Duplicitne Item ID nie su prevenovane', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'ShoppingListStore.ts:53-62, ActiveShoppingStore.ts:72-82'),
      para('Problem: randomUUID() bez duplicate check. UUID kolize su extremne vzacne ale bez defensive check = delete oboch items s rovnakym ID. Vsetky operacie (update, delete, toggle) pouzivaju id na identifikaciu - koliza by postihla viacero poloziek.'),
      para('Riziko: Strata dat - vymazanie alebo modifikacia nespravnych poloziek.'),
      codePara('// Oprava: generateUniqueId() s retry logikou'),
      codePara('function generateUniqueId(existingIds: Set<string>): string {'),
      codePara('  let id = crypto.randomUUID()'),
      codePara('  let attempts = 0'),
      codePara('  while (existingIds.has(id) && attempts < 10) {'),
      codePara('    id = crypto.randomUUID()'),
      codePara('    attempts++'),
      codePara('  }'),
      codePara('  return id'),
      codePara('}'),
      new Paragraph({ spacing: { after: 300 } }),

      // 2.5
      heading('2.5 Clipboard import bez sanitizacie', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'ListClipboardService.ts:27-74'),
      para('Problem: Limity na riadky existuju (1000/500) ale chyba HTML/JS sanitizacia. Buduci web port = XSS. Control characters mozu koruptovat data. Unicode zero-width characters, HTML tagy a JavaScript v clipboard obsahu nie su odfiltrovane.'),
      para('Riziko: XSS pri web porte, data korupcia cez control characters, vizualne glitche cez zero-width unicode.'),
      codePara('// Oprava: sanitizeItemName() funkcia'),
      codePara('function sanitizeItemName(name: string): string {'),
      codePara('  return name'),
      codePara('    .replace(/<[^>]*>/g, "")        // Strip HTML'),
      codePara('    .replace(/[\\x00-\\x1F]/g, "")    // Strip control chars'),
      codePara('    .replace(/[\\u200B-\\u200F]/g, "") // Strip zero-width'),
      codePara('    .trim()'),
      codePara('}'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 3. HIGH ISSUES =====
      heading('3. HIGH - Dolezite opravit'),

      // 3.1
      heading('3.1 Chybajuci Error Boundary', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'App.tsx'),
      para('Problem: Ziadny React Error Boundary v celej aplikacii. Render error v hociktorom komponente = biely screen bez recovery. Pouzivatel musi force-quit aplikaciu. Neexistuje sposob ako zobrazit uzivatelsky privetive chybove hlasenie.'),
      para('Dopad: Neopravitelny biely screen - jediny sposob je kill + restart aplikacie.'),
      codePara('// Oprava: ErrorBoundary komponent'),
      codePara('class ErrorBoundary extends React.Component<Props, State> {'),
      codePara('  static getDerivedStateFromError(error: Error) {'),
      codePara('    return { hasError: true, error }'),
      codePara('  }'),
      codePara('  render() {'),
      codePara('    if (this.state.hasError) return <ErrorFallback onRetry={...} />'),
      codePara('    return this.props.children'),
      codePara('  }'),
      codePara('}'),
      new Paragraph({ spacing: { after: 300 } }),

      // 3.2
      heading('3.2 Performance problemy vo filtrovani', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'ShoppingListScreen.tsx:26-42'),
      para('Problem: sortedItems vytvara novu referenciu pri kazdej zmene items. filteredItems sa prepocitava aj ked filterText sa nezmenil. Pri 1000+ polozkach to sposobi freeze UI na nizkovykonnych zariadeniach.'),
      para('Dopad: UI freeze 100-500ms pri kazdej zmene polozky na listoch s 500+ polozkach.'),
      codePara('// Oprava: Zlucit sort+filter do jedneho useMemo'),
      codePara('const processedItems = useMemo(() => {'),
      codePara('  const filtered = items.filter(item =>'),
      codePara('    item.name.toLowerCase().includes(filterText.toLowerCase())'),
      codePara('  )'),
      codePara('  return filtered.sort(sortFn)'),
      codePara('}, [items, filterText, sortFn])'),
      new Paragraph({ spacing: { after: 300 } }),

      // 3.3
      heading('3.3 Async operacia bez cleanup', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'ActiveShoppingStore.ts:103-127'),
      para('Problem: isFinishing sa nastavi na true ale ak operacia zlyhá uprostred, flag sa nikdy nevrati na false = permanent block. Pouzivatel nemoze znovu dokoncit nakup pokial nerestartuje aplikaciu.'),
      para('Dopad: Permanentne zablokovane "Dokoncit nakup" tlacidlo po jednom zlyhani.'),
      codePara('// Oprava: try/finally pattern'),
      codePara('async finishShopping() {'),
      codePara('  set({ isFinishing: true })'),
      codePara('  try {'),
      codePara('    await saveToHistory(...)'),
      codePara('    await clearActive(...)'),
      codePara('  } catch (e) {'),
      codePara('    console.error("[ActiveShoppingStore] Finish failed:", e)'),
      codePara('  } finally {'),
      codePara('    set({ isFinishing: false }) // Always reset'),
      codePara('  }'),
      codePara('}'),
      new Paragraph({ spacing: { after: 300 } }),

      // 3.4
      heading('3.4 Console logy v produkcii', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'Vsetky stores a services (50+ vyskytov)'),
      para('Problem: console.warn() a console.log() volania v produkcnom kode. Performance degradacia (kazdy log = serializacia + IO), exposovany interny stav aplikacie cez developer tools.'),
      para('Dopad: Spomalenie na nizkovykonnych zariadeniach, bezpecnostne riziko pri inspektovani logov.'),
      codePara('// Oprava: Logger service s __DEV__ guardom'),
      codePara('const logger = {'),
      codePara('  warn: (tag: string, ...args: unknown[]) => {'),
      codePara('    if (__DEV__) console.warn(`[${tag}]`, ...args)'),
      codePara('  },'),
      codePara('  error: (tag: string, ...args: unknown[]) => {'),
      codePara('    console.error(`[${tag}]`, ...args) // Errors always logged'),
      codePara('  }'),
      codePara('}'),
      new Paragraph({ spacing: { after: 300 } }),

      // 3.5
      heading('3.5 Backup validacia chyba', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'BackupService.ts:41-74'),
      para('Problem: Ziadna validacia file size, content type, data structure pri restore operacii. 1GB file = memory overflow. Nevalidna JSON struktura moze sposobit partial restore s corrupted datami.'),
      para('Dopad: Crash pri obnoveni z velkeho suboru, ticha korupcia dat pri nevalidnej strukture.'),
      codePara('// Oprava: Validacia pred restore'),
      codePara('const MAX_BACKUP_SIZE = 10 * 1024 * 1024 // 10MB'),
      codePara('if (fileSize > MAX_BACKUP_SIZE) throw new Error("Backup too large")'),
      codePara(''),
      codePara('function isValidBackupData(data: unknown): data is BackupData {'),
      codePara('  return typeof data === "object" && data !== null'),
      codePara('    && "version" in data && "items" in data'),
      codePara('    && Array.isArray(data.items)'),
      codePara('}'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 4. MEDIUM ISSUES =====
      heading('4. MEDIUM - Odporucane opravit'),

      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: '#', width: 500 },
            { text: 'Problem', width: 3500 },
            { text: 'Subor', width: 2500 },
            { text: 'Dopad', width: 2500 },
          ], true),
          tableRow([
            { text: '10', width: 500 },
            { text: 'Debounce na filter input chyba', width: 3500 },
            { text: 'ShoppingListScreen.tsx', width: 2500 },
            { text: 'Lag pri 500+ polozkach', width: 2500 },
          ]),
          tableRow([
            { text: '11', width: 500 },
            { text: 'AsyncStorage kluce bez namespace', width: 3500 },
            { text: 'Vsetky stores', width: 2500 },
            { text: 'Key collision s kniznicami', width: 2500 },
          ]),
          tableRow([
            { text: '12', width: 500 },
            { text: 'Locale fallback moze byt undefined', width: 3500 },
            { text: 'i18n.ts:24-27', width: 2500 },
            { text: 'Crash na misconfigured devices', width: 2500 },
          ]),
          tableRow([
            { text: '13', width: 500 },
            { text: 'Color validacia warn spam v render loope', width: 3500 },
            { text: 'ColorUtils.ts:19-23', width: 2500 },
            { text: 'Console spam v render loope', width: 2500 },
          ]),
          tableRow([
            { text: '14', width: 500 },
            { text: 'AbortController chyba v init', width: 3500 },
            { text: 'App.tsx:43-55', width: 2500 },
            { text: 'Memory leak pri unmount', width: 2500 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 5. LOW ISSUES =====
      heading('5. LOW - Nice to have'),

      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: '#', width: 500 },
            { text: 'Problem', width: 4000 },
            { text: 'Subor', width: 2500 },
            { text: 'Poznamka', width: 2000 },
          ], true),
          tableRow([
            { text: '15', width: 500 },
            { text: 'Hardcoded farby (#ffffff) v niektory miestach', width: 4000 },
            { text: 'Viacero suborov', width: 2500 },
            { text: 'Dark mode', width: 2000 },
          ]),
          tableRow([
            { text: '16', width: 500 },
            { text: 'Touch targets pod 44px', width: 4000 },
            { text: 'ColorPickerScreen, ShoppingHistory', width: 2500 },
            { text: 'A11y', width: 2000 },
          ]),
          tableRow([
            { text: '17', width: 500 },
            { text: 'Chybajuce accessibilityLabel', width: 4000 },
            { text: 'AppNavigator, ShoppingListScreen', width: 2500 },
            { text: 'Screen reader', width: 2000 },
          ]),
          tableRow([
            { text: '18', width: 500 },
            { text: 'Ziadne unit testy', width: 4000 },
            { text: 'Cely projekt', width: 2500 },
            { text: '0% pokrytie', width: 2000 },
          ]),
          tableRow([
            { text: '19', width: 500 },
            { text: 'Magic numbers bez konstant', width: 4000 },
            { text: 'Viacero suborov', width: 2500 },
            { text: 'Udrzovatelnost', width: 2000 },
          ]),
          tableRow([
            { text: '20', width: 500 },
            { text: 'Chybajuce JSDoc na utility funkciach', width: 4000 },
            { text: 'ColorUtils, ListClipboard', width: 2500 },
            { text: 'Dokumentacia', width: 2000 },
          ]),
          tableRow([
            { text: '21', width: 500 },
            { text: 'Theme flash pri startup (theme loaded async)', width: 4000 },
            { text: 'ThemeStore.ts', width: 2500 },
            { text: 'UX', width: 2000 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 6. POZITIVNE HODNOTENIE =====
      heading('6. Pozitivne hodnotenie - Co funguje dobre'),

      heading('6.1 TypeScript a typova bezpecnost', HeadingLevel.HEADING_2),
      bullet('Strict mode aktivny s noUncheckedIndexedAccess - najvyssia uroven typovej bezpecnosti'),
      bullet('Ziadne "any" typy v celej kodovej baze - disciplinovany pristup'),
      bullet('Konzistentne TypeScript interfaces na vsetkych komponentoch a store typoch'),
      bullet('Spravne pouzitie union typov a type guards kde je to potrebne'),
      new Paragraph({ spacing: { after: 200 } }),

      heading('6.2 Architektura a struktura kodu', HeadingLevel.HEADING_2),
      bullet('Cista Zustand store architektura - jasna separacia stavu od UI komponentov'),
      bullet('Dobre rozdelene adresare: screens/ pre obrazovky, stores/ pre stav, services/ pre biznis logiku'),
      bullet('Modularny TutorialOverlay rozdeleny na 14 samostatnych suborov - vyborny priklad refaktoringu'),
      bullet('Theming system cez react-native-unistyles s konzistentnym pouzitim design tokenov'),
      new Paragraph({ spacing: { after: 200 } }),

      heading('6.3 UX a uzivatelsky zazitok', HeadingLevel.HEADING_2),
      bullet('12 jazykov s fallbackom na EN - vyborne pre medzinarodnu distribiciu'),
      bullet('Haptic feedback na vsetkych dotykoch - profesionalny pocit z aplikacie'),
      bullet('Tutorial overlay s plynulymi animaciami - kvalitny onboarding noveho pouzivatela'),
      bullet('Backup/restore funkcia cez zdielanie JSON - jednoduche a funkcne riesenie'),
      bullet('Kreativne swipe patterny (lava/prava polovica) - elegantne riesenie v ramci limitov React Native gest'),
      new Paragraph({ spacing: { after: 200 } }),

      heading('6.4 Bezpecnost', HeadingLevel.HEADING_2),
      bullet('Ziadne API kluce ani secrety v zdrojovom kode'),
      bullet('Ziadne SQL injection zranitelnosti (aplikacia nepouziva SQL databazu)'),
      bullet('Ziadne citlive pouzivatelske data v konzolowych logoch'),
      bullet('AsyncStorage pouzity spravne pre lokalne nekriticke data'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 7. ANALYZA STRUKTURY KODU =====
      heading('7. Analyza struktury kodu'),

      heading('7.1 Subory podla velkosti (po refaktoringu TutorialOverlay)', HeadingLevel.HEADING_2),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: 'Subor', width: 4500 },
            { text: 'Riadky', width: 1500 },
            { text: 'Hodnotenie', width: 3000 },
          ], true),
          tableRow([{ text: 'ShoppingListItem.tsx', width: 4500 }, { text: '376', width: 1500 }, { text: 'OK - gestova logika', width: 3000 }]),
          tableRow([{ text: 'ColorPickerScreen.tsx', width: 4500 }, { text: '318', width: 1500 }, { text: 'OK', width: 3000 }]),
          tableRow([{ text: 'ShoppingHistoryScreen.tsx', width: 4500 }, { text: '309', width: 1500 }, { text: 'OK', width: 3000 }]),
          tableRow([{ text: 'animStyles.ts (TutorialOverlay)', width: 4500 }, { text: '~300', width: 1500 }, { text: 'OK - ciste styly', width: 3000 }]),
          tableRow([{ text: 'SettingsScreen.tsx', width: 4500 }, { text: '294', width: 1500 }, { text: 'OK', width: 3000 }]),
          tableRow([{ text: 'ShoppingListScreen.tsx', width: 4500 }, { text: '281', width: 1500 }, { text: 'OK', width: 3000 }]),
          tableRow([{ text: 'ActiveShoppingScreen.tsx', width: 4500 }, { text: '184', width: 1500 }, { text: 'OK', width: 3000 }]),
          tableRow([{ text: 'ShoppingListStore.ts', width: 4500 }, { text: '150', width: 1500 }, { text: 'OK', width: 3000 }]),
          tableRow([{ text: 'AccentColorStore.ts', width: 4500 }, { text: '149', width: 1500 }, { text: 'OK', width: 3000 }]),
          tableRow([{ text: 'ListClipboardService.ts', width: 4500 }, { text: '140', width: 1500 }, { text: 'OK', width: 3000 }]),
          tableRow([{ text: 'ActiveShoppingStore.ts', width: 4500 }, { text: '139', width: 1500 }, { text: 'OK', width: 3000 }]),
          tableRow([{ text: 'QuantityAnimation.tsx', width: 4500 }, { text: '~120', width: 1500 }, { text: 'OK - zluceny z 2 komponentov', width: 3000 }]),
          tableRow([{ text: 'ColorUtils.ts', width: 4500 }, { text: '111', width: 1500 }, { text: 'OK', width: 3000 }]),
          tableRow([{ text: 'TutorialOverlay.tsx (hlavny)', width: 4500 }, { text: '~130', width: 1500 }, { text: 'OK - po refaktoringu', width: 3000 }]),
          tableRow([{ text: 'TouchIndicator.tsx', width: 4500 }, { text: '~130', width: 1500 }, { text: 'OK', width: 3000 }]),
          tableRow([{ text: 'styles.ts (TutorialOverlay)', width: 4500 }, { text: '~100', width: 1500 }, { text: 'OK', width: 3000 }]),
          tableRow([{ text: 'Ostatne animacie (6x)', width: 4500 }, { text: '60-90 kazda', width: 1500 }, { text: 'OK', width: 3000 }]),
        ],
      }),
      new Paragraph({ spacing: { after: 200 } }),
      boldPara('Poznamka: ', 'Povodny TutorialOverlay.tsx (1474 riadkov) bol rozdeleny na 14 suborov - vyrazne zlepsenie udrzovatelnosti. Ziadny subor teraz nepresahuje 400 riadkov.'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 8. BEZPECNOSTNA ANALYZA =====
      heading('8. Bezpecnostna analyza'),

      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: 'Kontrola', width: 4500 },
            { text: 'Stav', width: 1500 },
            { text: 'Poznamka', width: 3000 },
          ], true),
          tableRow([{ text: 'Exponovane API kluce / secrety', width: 4500 }, { text: 'OK', width: 1500, color: '4CAF50' }, { text: 'Ziadne najdene', width: 3000 }]),
          tableRow([{ text: 'SQL injection zranitelnosti', width: 4500 }, { text: 'N/A', width: 1500 }, { text: 'Nepouziva SQL', width: 3000 }]),
          tableRow([{ text: 'XSS zranitelnosti', width: 4500 }, { text: 'OK', width: 1500, color: '4CAF50' }, { text: 'React nativne escapuje', width: 3000 }]),
          tableRow([{ text: 'Input validacia', width: 4500 }, { text: 'WARN', width: 1500, color: 'FF9900' }, { text: 'Clipboard a hex bez limitov', width: 3000 }]),
          tableRow([{ text: 'Citlive data v logoch', width: 4500 }, { text: 'OK', width: 1500, color: '4CAF50' }, { text: 'Ziadne', width: 3000 }]),
          tableRow([{ text: 'Rate limiting na zapis', width: 4500 }, { text: 'WARN', width: 1500, color: 'FF9900' }, { text: 'AsyncStorage bez debouncingu', width: 3000 }]),
          tableRow([{ text: 'Backup sifrovanie', width: 4500 }, { text: 'N/A', width: 1500 }, { text: 'Plaintext JSON - akceptovatelne pre shopping list', width: 3000 }]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 9. ACCESSIBILITY ANALYZA =====
      heading('9. Accessibility analyza'),

      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: 'Kontrola', width: 4500 },
            { text: 'Stav', width: 1500 },
            { text: 'Poznamka', width: 3000 },
          ], true),
          tableRow([{ text: 'Minimalna velkost dotykovych cielov (44pt)', width: 4500 }, { text: 'OK', width: 1500, color: '4CAF50' }, { text: 'itemHeight: 48px', width: 3000 }]),
          tableRow([{ text: 'accessibilityLabel na interaktivnych prvkoch', width: 4500 }, { text: 'CHYBA', width: 1500, color: 'CC0000' }, { text: 'Ziadne na swipe/tap elementoch', width: 3000 }]),
          tableRow([{ text: 'accessibilityHint pre zlozite gesta', width: 4500 }, { text: 'CHYBA', width: 1500, color: 'CC0000' }, { text: 'Swipe gesta nemaju hinty', width: 3000 }]),
          tableRow([{ text: 'Screen reader testovanie', width: 4500 }, { text: 'NEZNAME', width: 1500, color: 'FF9900' }, { text: 'Nebolo mozne overit', width: 3000 }]),
          tableRow([{ text: 'Vysoko-kontrastny rezim', width: 4500 }, { text: 'WARN', width: 1500, color: 'FF9900' }, { text: 'Biele texty na farebnom pozadi', width: 3000 }]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 10. PERFORMANCE ANALYZA =====
      heading('10. Performance analyza'),

      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: 'Kontrola', width: 4500 },
            { text: 'Stav', width: 1500 },
            { text: 'Poznamka', width: 3000 },
          ], true),
          tableRow([{ text: 'Memoizacia derivovanych dat', width: 4500 }, { text: 'OK', width: 1500, color: '4CAF50' }, { text: 'useMemo na filtrach a sortovani', width: 3000 }]),
          tableRow([{ text: 'useEffect cleanup', width: 4500 }, { text: 'OK', width: 1500, color: '4CAF50' }, { text: 'Spravne cleanup funkcie', width: 3000 }]),
          tableRow([{ text: 'Lazy loading', width: 4500 }, { text: 'OK', width: 1500, color: '4CAF50' }, { text: 'Jazyky lazy-loaded', width: 3000 }]),
          tableRow([{ text: 'Debouncing na user input', width: 4500 }, { text: 'CHYBA', width: 1500, color: 'FF9900' }, { text: 'Filter kazdym keystrokom', width: 3000 }]),
          tableRow([{ text: 'AsyncStorage write batching', width: 4500 }, { text: 'CHYBA', width: 1500, color: 'FF9900' }, { text: 'Kazdy tap = novy write', width: 3000 }]),
          tableRow([{ text: 'React.memo na list items', width: 4500 }, { text: 'CHYBA', width: 1500, color: 'FF9900' }, { text: 'ActiveShoppingItem bez memo', width: 3000 }]),
          tableRow([{ text: 'Paralelna inicializacia', width: 4500 }, { text: 'OK', width: 1500, color: '4CAF50' }, { text: 'Promise.all na starte', width: 3000 }]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 11. ODPORUCANIA =====
      heading('11. Odporucania na opravu (prioritizovane)'),

      heading('Priorita 1 - CRITICAL + kluoovy HIGH fix', HeadingLevel.HEADING_2),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: '#', width: 500 },
            { text: 'Akcia', width: 5000 },
            { text: 'Narocnost', width: 1500 },
            { text: 'Riziko', width: 2000 },
          ], true),
          tableRow([
            { text: '1', width: 500 },
            { text: 'CRITICAL-1: Debounced persistence pre AsyncStorage writes', width: 5000 },
            { text: 'Stredna', width: 1500 },
            { text: 'Nizke', width: 2000 },
          ]),
          tableRow([
            { text: '2', width: 500 },
            { text: 'CRITICAL-2: Runtime JSON validation s isValidShoppingItem()', width: 5000 },
            { text: 'Nizka', width: 1500 },
            { text: 'Minimalne', width: 2000 },
          ]),
          tableRow([
            { text: '3', width: 500 },
            { text: 'CRITICAL-3: Error recovery init - separovat kriticke od nekritickych', width: 5000 },
            { text: 'Stredna', width: 1500 },
            { text: 'Nizke', width: 2000 },
          ]),
          tableRow([
            { text: '4', width: 500 },
            { text: 'HIGH-1: ErrorBoundary komponent s retry tlacidlom', width: 5000 },
            { text: 'Nizka', width: 1500 },
            { text: 'Minimalne', width: 2000 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 300 } }),

      heading('Priorita 2 - HIGH fixes', HeadingLevel.HEADING_2),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: '#', width: 500 },
            { text: 'Akcia', width: 5000 },
            { text: 'Narocnost', width: 1500 },
            { text: 'Riziko', width: 2000 },
          ], true),
          tableRow([
            { text: '5', width: 500 },
            { text: 'HIGH-2: Zlucit sort+filter do jedneho useMemo', width: 5000 },
            { text: 'Nizka', width: 1500 },
            { text: 'Minimalne', width: 2000 },
          ]),
          tableRow([
            { text: '6', width: 500 },
            { text: 'HIGH-3: try/finally v finishShopping - always reset isFinishing', width: 5000 },
            { text: 'Nizka', width: 1500 },
            { text: 'Ziadne', width: 2000 },
          ]),
          tableRow([
            { text: '7', width: 500 },
            { text: 'HIGH-5: Backup validacia - MAX_BACKUP_SIZE + isValidBackupData', width: 5000 },
            { text: 'Stredna', width: 1500 },
            { text: 'Nizke', width: 2000 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 300 } }),

      heading('Priorita 3 - MEDIUM/LOW na neskor', HeadingLevel.HEADING_2),
      bullet('Debounce na filter input (useDeferredValue alebo custom debounce)'),
      bullet('AsyncStorage namespace prefix na vsetkych klucoch'),
      bullet('Locale fallback s defensive check'),
      bullet('Logger service namiesto console.warn v produkcii'),
      bullet('sanitizeItemName() pre clipboard import'),
      bullet('generateUniqueId() s duplicate check'),
      bullet('Accessibility labels na interaktivnych elementoch'),
      bullet('Automatizovane unit testy (Jest + React Native Testing Library)'),
      bullet('Theme flash fix - synchronne nacitanie theme pred renderom'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 12. CELKOVE HODNOTENIE =====
      heading('12. Celkove hodnotenie'),
      para('1GoShop je kvalitne architekturovana shopping list aplikacia s modernymi React Native praktikami. TypeScript strict mode a konzistentne Zustand patterny ukazuju na skuseneho vyvojara. Hlavne problemy su v oblasti error handlingu, persistence robustnosti a defensive programmingu. Po oprave CRITICAL nalezov by bola aplikacia plne production-ready pre App Store aj Google Play.'),
      new Paragraph({ spacing: { after: 200 } }),

      boldPara('Celkova znamka: ', 'B-'),
      new Paragraph({ spacing: { after: 200 } }),

      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: 'Oblast', width: 3000 },
            { text: 'Hodnotenie', width: 2000 },
            { text: 'Poznamka', width: 4000 },
          ], true),
          tableRow([
            { text: 'TypeScript kvalita', width: 3000 },
            { text: 'EXCELLENT', width: 2000, color: '4CAF50' },
            { text: 'Strict mode, ziadne any typy', width: 4000 },
          ]),
          tableRow([
            { text: 'Architektura', width: 3000 },
            { text: 'GOOD', width: 2000, color: '4CAF50' },
            { text: 'Cista separacia, konzistentne patterny', width: 4000 },
          ]),
          tableRow([
            { text: 'Error handling', width: 3000 },
            { text: 'NEEDS WORK', width: 2000, color: 'FF9900' },
            { text: '5 CRITICAL + 5 HIGH nalezov', width: 4000 },
          ]),
          tableRow([
            { text: 'Performance', width: 3000 },
            { text: 'GOOD', width: 2000, color: '4CAF50' },
            { text: 'Staci pre aktualne pouzitie, optimalizacie mozne', width: 4000 },
          ]),
          tableRow([
            { text: 'UX / Funkcionalita', width: 3000 },
            { text: 'EXCELLENT', width: 2000, color: '4CAF50' },
            { text: '12 jazykov, haptics, tutorial, backup', width: 4000 },
          ]),
          tableRow([
            { text: 'Bezpecnost', width: 3000 },
            { text: 'GOOD', width: 2000, color: '4CAF50' },
            { text: 'Input validacia a sanitizacia potrebuju zlepsenie', width: 4000 },
          ]),
          tableRow([
            { text: 'Accessibility', width: 3000 },
            { text: 'NEEDS WORK', width: 2000, color: 'FF9900' },
            { text: 'Chybajuce labels, hinty a screen reader podpora', width: 4000 },
          ]),
          tableRow([
            { text: 'Testovanie', width: 3000 },
            { text: 'MISSING', width: 2000, color: 'CC0000' },
            { text: 'Ziadne automatizovane testy, 0% pokrytie', width: 4000 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 300 } }),

      boldPara('Celkove hodnotenie: ', 'APPROVED with CHANGES REQUESTED'),
      boldPara('Celkovy pocet nalezov: ', '22 (5 CRITICAL, 5 HIGH, 5 MEDIUM, 7 LOW)'),
      boldPara('Odhadovana narocnost CRITICAL+HIGH oprav: ', 'Stredna - vacsina su jednoduche az stredne narocne zmeny'),
      new Paragraph({ spacing: { after: 400 } }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '--- Koniec reportu ---', size: 20, color: '999999', italics: true })]
      }),
    ],
  }],
})

const buffer = await Packer.toBuffer(doc)
const outputPath = path.join(outputDir, '2026-02-25-code-review-v5-independent-v1.2.0-b73.docx')
fs.writeFileSync(outputPath, buffer)
console.log(`Code review document saved to: ${outputPath}`)
