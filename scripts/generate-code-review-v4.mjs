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
  title: '1GoShop - Code Review Report #4 (Independent)',
  description: 'Independent code review of 1GoShop React Native application - fresh perspective',
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
        children: [new TextRun({ text: 'Code Review Report #4 (Independent)', size: 48, color: '666666' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Version 1.2.0 (Build #72)', size: 28, color: '999999' })]
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
        children: [new TextRun({ text: 'Nezavisly review - analyzovane akoby sa kodova baza videla prvy krat', size: 20, color: '999999', italics: true })]
      }),
      new Paragraph({ pageBreakBefore: true }),

      // ===== 1. EXECUTIVE SUMMARY =====
      heading('1. Executive Summary'),
      para('Nezavisly code review aplikacie 1GoShop po TutorialOverlay refaktoringu (Build #72). Cela kodova baza bola analyzovana od nuly bez ohladu na predchadzajuce review. Identifikovanych bolo 23 nalezov: 4 CRITICAL, 5 HIGH, 7 MEDIUM a 7 LOW.'),
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
            { text: '4', width: 1500 },
            { text: 'Race condition, backup restore, input validacia, clipboard bomb', width: 5500 },
          ]),
          tableRow([
            { text: 'HIGH', width: 2000, color: severityColor('HIGH') },
            { text: '5', width: 1500 },
            { text: 'Ticha strata dat, edge case qty, header theme, loading stav, formatDate', width: 5500 },
          ]),
          tableRow([
            { text: 'MEDIUM', width: 2000, color: severityColor('MEDIUM') },
            { text: '7', width: 1500 },
            { text: 'Re-rendery, debouncing, hardcoded farby, React.memo, logging, persistence', width: 5500 },
          ]),
          tableRow([
            { text: 'LOW', width: 2000, color: severityColor('LOW') },
            { text: '7', width: 1500 },
            { text: 'Verzia, magic numbers, a11y, naming, JSDoc, export, testy', width: 5500 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 200 } }),

      boldPara('Celkove hodnotenie: ', 'APPROVED with CHANGES REQUESTED'),
      boldPara('Analyzovanych suborov: ', '36 TypeScript suborov'),
      boldPara('Celkovy pocet riadkov: ', '~4,500'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 2. CRITICAL ISSUES =====
      heading('2. CRITICAL - Musia byt opravene'),

      // 2.1
      heading('2.1 Race condition pri inicializacii aplikacie', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'App.tsx:43-56'),
      para('Problem: Vsetky stores sa loaduju paralelne cez Promise.all(). Ak jeden store zlyhá, aplikacia pokracuje s ciastocne nacitanym stavom bez akehokolvek error recovery mechanizmu.'),
      para('Riziko: Pouzivatel moze stratit data alebo vidiet nekonzistentny stav ak je AsyncStorage docasne nedostupny.'),
      codePara('// Aktualne:'),
      codePara('await Promise.all([initI18n(), ...stores.load()])'),
      codePara('setIsReady(true) // Pokracuje aj ked nieco zlyhalo'),
      codePara(''),
      codePara('// Oprava:'),
      codePara('const results = await Promise.allSettled([...])'),
      codePara('const failures = results.filter(r => r.status === "rejected")'),
      codePara('if (failures.length > 0) console.error("[App] Init failures:", failures)'),
      new Paragraph({ spacing: { after: 300 } }),

      // 2.2
      heading('2.2 BackupService restore ticho zlyhava', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'BackupService.ts:57-75'),
      para('Problem: restoreBackup() pouziva "void AsyncStorage.setItem()" ktore ticho prehltne chyby. Pouzivatel nevie ze restore zlyhal ciastocne. Moze dojst ku korupcii stavu aplikacie.'),
      para('Riziko: Ciastocny restore moze porusit integritu dat bez notifikacie pouzivatela.'),
      codePara('// Oprava: Pouzit Promise.allSettled + kontrola failures'),
      new Paragraph({ spacing: { after: 300 } }),

      // 2.3
      heading('2.3 hexToHsl bez validacie vstupu', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'ColorUtils.ts:19-41'),
      para('Problem: hexToHsl() predpoklada 7-znakovy #RRGGBB format bez validacie. Nevalidny vstup (napr. #FFF, #12345, ne-hex znaky) vytvori NaN hodnoty ktore sa propaguju do celeho theming systemu.'),
      para('Riziko: Crash aplikacie alebo vizualna korupcia ak pouzivatel zada nevalidny hex kod v color pickeri.'),
      codePara('// Oprava: Pridat regex validaciu'),
      codePara('if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {'),
      codePara('  console.warn("[ColorUtils] Invalid hex:", hex)'),
      codePara('  return { h: 0, s: 0, l: 50 } // Neutral gray fallback'),
      codePara('}'),
      new Paragraph({ spacing: { after: 300 } }),

      // 2.4
      heading('2.4 Clipboard bomb - chybajuci limit na vstup', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'ListClipboardService.ts:24-72'),
      para('Problem: parseListText() spracovava clipboard data bez akychkolvek limitov. Clipboard s milionmi riadkov moze zamrazit aplikaciu. Chyba limit na pocet riadkov aj dlzku riadku.'),
      para('Riziko: Denial of Service cez clipboard bomb (aj neumyselne - napr. skopirovat velky subor).'),
      codePara('// Oprava: Pridat limity'),
      codePara('const MAX_LINES = 1000'),
      codePara('const MAX_LINE_LENGTH = 500'),
      codePara('const lines = text.split(/\\r\\n|\\r|\\n/).slice(0, MAX_LINES)'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 3. HIGH ISSUES =====
      heading('3. HIGH - Dolezite opravit'),

      // 3.1
      heading('3.1 Ticha strata dat pri persistence zlyhani', HeadingLevel.HEADING_2),
      boldPara('Subory: ', 'ShoppingListStore.ts:148, ActiveShoppingStore.ts:137, AccentColorStore.ts:97'),
      para('Problem: Vsetky persistence volania pouzivaju .catch() len s console.warn. Pouzivatel nie je notifikovany ze jeho data neboli ulozene. Pri plnom uloziste alebo chybe IO pouzivatel strati zmeny bez vedomia.'),
      para('Dopad: Ticha strata dat - pouzivatel si mysli ze zmeny su ulozene ale po restarte su prec.'),
      new Paragraph({ spacing: { after: 300 } }),

      // 3.2
      heading('3.2 Edge case v decrementQuantity', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'ShoppingListStore.ts:101-107'),
      para('Problem: decrementQuantity() brani iba poklesu pod 1, ale nehandluje scenar kde quantity je uz 0 (korupcia dat). V takom pripade pouzivatel nemoze opravit polozku cez UI.'),
      codePara('// Oprava: Pouzit Math.max(1, item.quantity - 1)'),
      new Paragraph({ spacing: { after: 300 } }),

      // 3.3
      heading('3.3 AppNavigator header nereaguje na theme', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'AppNavigator.tsx:20-34'),
      para('Problem: headerColor cita len activeColor zo store a ignoruje theme zmeny (light/dark mode). Header zostava rovnaky pri prepnuti temy pokial pouzivatel nema nastaveny custom accent.'),
      para('Dopad: Slaba UX - farba headeru sa neadaptuje na dark mode.'),
      new Paragraph({ spacing: { after: 300 } }),

      // 3.4
      heading('3.4 finishShopping bez loading stavu', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'ActiveShoppingStore.ts:101-123'),
      para('Problem: finishShopping() vykonava 3 sekvencne async operacie bez loading indikatora. Pouzivatel moze navigovat prec pocas ukladania. Ak zavre app uprostred operacie, moze dojst ku korupcii historie.'),
      new Paragraph({ spacing: { after: 300 } }),

      // 3.5
      heading('3.5 formatDate len pre 2 z 12 jazykov', HeadingLevel.HEADING_2),
      boldPara('Subor: ', 'ShoppingHistoryScreen.tsx:159-168'),
      para('Problem: formatDate() podporuje len locale "sk" a "en". Ostatnych 10 jazykov (de, hu, uk, cs, zh, es, fr, it, pl, pt) dostane anglicky format datumov namiesto natívneho formatu ich jazyka.'),
      codePara('// Oprava: Mapovat vsetky jazyky'),
      codePara('const localeMap = { sk: "sk-SK", en: "en-US", de: "de-DE", hu: "hu-HU", ... }'),
      codePara('const locale = localeMap[lang] ?? "en-US"'),
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
            { text: '3 separate useMemo - zbytocne re-rendery', width: 3500 },
            { text: 'ShoppingListScreen.tsx:31-42', width: 2500 },
            { text: 'Performance pri 50+ polozkach', width: 2500 },
          ]),
          tableRow([
            { text: '11', width: 500 },
            { text: 'Chybajuci debouncing na filter input', width: 3500 },
            { text: 'AddItemInput.tsx:14-60', width: 2500 },
            { text: 'Lag pri pisani so 100+ polozkami', width: 2500 },
          ]),
          tableRow([
            { text: '12', width: 500 },
            { text: 'Hardcoded #ffffff namiesto theme farby', width: 3500 },
            { text: 'ActiveShoppingScreen, ShoppingHistory', width: 2500 },
            { text: 'Nefunguje so svetlym accentom', width: 2500 },
          ]),
          tableRow([
            { text: '13', width: 500 },
            { text: 'renderItem bez React.memo', width: 3500 },
            { text: 'ActiveShoppingScreen.tsx:41-46', width: 2500 },
            { text: 'Zbytocne re-rendery poloziek', width: 2500 },
          ]),
          tableRow([
            { text: '14', width: 500 },
            { text: 'Nekonzistentny format error logov', width: 3500 },
            { text: 'Viacero suborov', width: 2500 },
            { text: 'Tazke debugovanie', width: 2500 },
          ]),
          tableRow([
            { text: '15', width: 500 },
            { text: 'Over-persistence pri rapidnom qty tapovani', width: 3500 },
            { text: 'ShoppingListStore.ts:93-99', width: 2500 },
            { text: 'AsyncStorage zahltenie', width: 2500 },
          ]),
          tableRow([
            { text: '16', width: 500 },
            { text: 'Chybajuci loading stav pri async operaciach', width: 3500 },
            { text: 'ActiveShoppingStore.ts', width: 2500 },
            { text: 'Mozna korupcia dat', width: 2500 },
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
            { text: '17', width: 500 },
            { text: 'Hardcoded verzia "v1.2.0" v SettingsScreen', width: 4000 },
            { text: 'SettingsScreen.tsx:111', width: 2500 },
            { text: 'Manualna aktualizacia', width: 2000 },
          ]),
          tableRow([
            { text: '18', width: 500 },
            { text: 'Magic numbers (SWIPE_THRESHOLD=30) bez kontextu', width: 4000 },
            { text: 'ShoppingListItem.tsx:24', width: 2500 },
            { text: 'Nezrozumitelne', width: 2000 },
          ]),
          tableRow([
            { text: '19', width: 500 },
            { text: 'Chybajuce accessibilityLabel na interaktivnych elementoch', width: 4000 },
            { text: 'ShoppingListItem.tsx', width: 2500 },
            { text: 'Screen reader', width: 2000 },
          ]),
          tableRow([
            { text: '20', width: 500 },
            { text: 'Mix handle/on naming pre event handlery', width: 4000 },
            { text: 'Viacero suborov', width: 2500 },
            { text: 'Konzistencia', width: 2000 },
          ]),
          tableRow([
            { text: '21', width: 500 },
            { text: 'Chybajuce JSDoc na utility funkciach', width: 4000 },
            { text: 'ColorUtils.ts', width: 2500 },
            { text: 'Dokumentacia', width: 2000 },
          ]),
          tableRow([
            { text: '22', width: 500 },
            { text: 'Zbytocny sort pri prazdnom exporte do clipboard', width: 4000 },
            { text: 'ListClipboardService.ts:79', width: 2500 },
            { text: 'Mikrooptimalizacia', width: 2000 },
          ]),
          tableRow([
            { text: '23', width: 500 },
            { text: 'Chybajuce automatizovane testy (Jest), CI/CD, crash reporting', width: 4000 },
            { text: 'Cely projekt', width: 2500 },
            { text: 'Dlhodoba kvalita', width: 2000 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 6. POZITIVNE HODNOTENIE =====
      heading('6. Pozitivne hodnotenie - Co funguje dobre'),

      heading('6.1 TypeScript a kod kvalita', HeadingLevel.HEADING_2),
      bullet('Strict mode + noUncheckedIndexedAccess - najvyssi standard typovej bezpecnosti'),
      bullet('Konzistentny Zustand store pattern - jasna separacia concerns'),
      bullet('Spravne pouzitie React hooks (useMemo, useCallback) na kritickych miestach'),
      bullet('Ciste rozhrania - Props interfaces na vsetkych komponentoch'),
      new Paragraph({ spacing: { after: 200 } }),

      heading('6.2 Architektura', HeadingLevel.HEADING_2),
      bullet('Cista adresarova struktura: screens/components/ pre screen-specificke, stores/ pre stav, services/ pre logiku'),
      bullet('TutorialOverlay pekne rozdeleny do 14 suborov (cerstvy refaktoring) - dobry priklad modularizacie'),
      bullet('Theming system cez react-native-unistyles s konzistentnym pouzitim theme tokenov'),
      bullet('Lazy loading jazykov (len SK+EN na starte, ostatne on-demand) - smart optimalizacia'),
      new Paragraph({ spacing: { after: 200 } }),

      heading('6.3 UX a funkcionalita', HeadingLevel.HEADING_2),
      bullet('12 jazykov s fallbackom na EN - vyborne pre stredoeuropsku appku'),
      bullet('Kreativny "lava/prava polovica" swipe pattern - elegantne riesenie limitovanych swipe smerov'),
      bullet('Haptic feedback na vsetkych interakciach - zlepsi vnimanu responzivnost'),
      bullet('Tutorial overlay s animaciami - profesionalne onboarding'),
      bullet('Backup/restore funkcia cez zdielanie JSON - jednoduche a funkcne'),
      new Paragraph({ spacing: { after: 200 } }),

      heading('6.4 Bezpecnost', HeadingLevel.HEADING_2),
      bullet('Ziadne exponovane API kluce alebo secrety v kode'),
      bullet('Ziadne SQL injection zranitelnosti (nepouziva SQL)'),
      bullet('Ziadne citlive data v logoch'),
      bullet('AsyncStorage pouzity spravne pre lokalne data'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 7. ANALYZA STRUKTURY KODU =====
      heading('7. Analyza struktury kodu'),

      heading('7.1 Subory podla velkosti (po refaktoringu)', HeadingLevel.HEADING_2),
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

      heading('Priorita 1 - CRITICAL fixes', HeadingLevel.HEADING_2),
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
            { text: 'Promise.allSettled + error recovery v App.tsx', width: 5000 },
            { text: 'Nizka', width: 1500 },
            { text: 'Minimalne', width: 2000 },
          ]),
          tableRow([
            { text: '2', width: 500 },
            { text: 'await + error handling v BackupService.restoreBackup', width: 5000 },
            { text: 'Nizka', width: 1500 },
            { text: 'Minimalne', width: 2000 },
          ]),
          tableRow([
            { text: '3', width: 500 },
            { text: 'Hex validacia v ColorUtils.hexToHsl', width: 5000 },
            { text: 'Nizka', width: 1500 },
            { text: 'Minimalne', width: 2000 },
          ]),
          tableRow([
            { text: '4', width: 500 },
            { text: 'Limity v ListClipboardService.parseListText', width: 5000 },
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
            { text: 'formatDate s locale mapou pre vsetkych 12 jazykov', width: 5000 },
            { text: 'Nizka', width: 1500 },
            { text: 'Minimalne', width: 2000 },
          ]),
          tableRow([
            { text: '6', width: 500 },
            { text: 'Math.max(1, qty-1) v decrementQuantity', width: 5000 },
            { text: 'Nizka', width: 1500 },
            { text: 'Ziadne', width: 2000 },
          ]),
          tableRow([
            { text: '7', width: 500 },
            { text: 'AppNavigator header farba z theme', width: 5000 },
            { text: 'Stredna', width: 1500 },
            { text: 'Nizke', width: 2000 },
          ]),
          tableRow([
            { text: '8', width: 500 },
            { text: 'Loading stav v finishShopping', width: 5000 },
            { text: 'Stredna', width: 1500 },
            { text: 'Nizke', width: 2000 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 300 } }),

      heading('Priorita 3 - MEDIUM/LOW na neskor', HeadingLevel.HEADING_2),
      bullet('Debouncing na filter input (useDeferredValue)'),
      bullet('React.memo na ActiveShoppingItem'),
      bullet('Debounced persistence pre rapidne qty zmeny'),
      bullet('Dynamicka verzia v SettingsScreen (z app.config.ts)'),
      bullet('Accessibility labels na interaktivnych elementoch'),
      bullet('Automatizovane testy (Jest + React Native Testing Library)'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 12. CELKOVE HODNOTENIE =====
      heading('12. Celkove hodnotenie'),
      para('1GoShop je dobre architekturovana shopping list aplikacia s modernymi React Native praktikami. Hlavne problemy su v oblasti error handlingu a edge casov, nie v fundamentalnej architekture. Po oprave CRITICAL nalezov by bola production-ready pre App Store release.'),
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
            { text: '4 CRITICAL nalezy', width: 4000 },
          ]),
          tableRow([
            { text: 'Performance', width: 3000 },
            { text: 'GOOD', width: 2000, color: '4CAF50' },
            { text: 'Staci pre aktualne pouzitie', width: 4000 },
          ]),
          tableRow([
            { text: 'UX / Funkcionalita', width: 3000 },
            { text: 'EXCELLENT', width: 2000, color: '4CAF50' },
            { text: '12 jazykov, haptics, tutorial, backup', width: 4000 },
          ]),
          tableRow([
            { text: 'Bezpecnost', width: 3000 },
            { text: 'GOOD', width: 2000, color: '4CAF50' },
            { text: 'Input validacia potrebuje zlepsenie', width: 4000 },
          ]),
          tableRow([
            { text: 'Accessibility', width: 3000 },
            { text: 'NEEDS WORK', width: 2000, color: 'FF9900' },
            { text: 'Chybajuce labels a hinty', width: 4000 },
          ]),
          tableRow([
            { text: 'Testovanie', width: 3000 },
            { text: 'MISSING', width: 2000, color: 'CC0000' },
            { text: 'Ziadne automatizovane testy', width: 4000 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 300 } }),

      boldPara('Celkove hodnotenie: ', 'APPROVED with CHANGES REQUESTED'),
      boldPara('Celkovy pocet nalezov: ', '23 (4 CRITICAL, 5 HIGH, 7 MEDIUM, 7 LOW)'),
      boldPara('Odhadovana narocnost CRITICAL+HIGH oprav: ', 'Nizka - vacsina su jednoduche zmeny'),
      new Paragraph({ spacing: { after: 400 } }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '--- Koniec reportu ---', size: 20, color: '999999', italics: true })]
      }),
    ],
  }],
})

const buffer = await Packer.toBuffer(doc)
const outputPath = path.join(outputDir, '2026-02-25-code-review-v4-independent-v1.2.0-b72.docx')
fs.writeFileSync(outputPath, buffer)
console.log(`Code review document saved to: ${outputPath}`)
