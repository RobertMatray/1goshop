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

const doc = new Document({
  creator: 'Claude Code Review',
  title: '1GoShop - Code Review Report #3',
  description: 'Third code review of 1GoShop React Native application',
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
        children: [new TextRun({ text: 'Code Review Report #3', size: 48, color: '666666' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Version 1.2.0 (Build #71)', size: 28, color: '999999' })]
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
        children: [new TextRun({ text: 'Porovnanie s predchadzajucimi review #1 (24.2.) a #2 (25.2.)', size: 20, color: '999999', italics: true })]
      }),
      new Paragraph({ pageBreakBefore: true }),

      // ===== 1. EXECUTIVE SUMMARY =====
      heading('1. Executive Summary'),
      para('Treti code review aplikacie 1GoShop po implementacii vsetkych oprav z druheho review a 5 dalsich vylepseni (Build #71). Celkovo bolo od prveho review opravanych 11 problemov. Kvalita kodu sa stabilne drzi na urovni GOOD. Zostava 5 otvorenych problemov z predchadzajucich review a 2 nove nalezy nizkej zavaznosti.'),
      new Paragraph({ spacing: { after: 200 } }),

      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: 'Kategoria', width: 3000 },
            { text: 'Stav', width: 2000 },
            { text: 'Pocet', width: 2000 },
            { text: 'Poznamka', width: 2000 },
          ], true),
          tableRow([
            { text: 'Opravene z review #2', width: 3000 },
            { text: 'FIXED', width: 2000, color: '4CAF50' },
            { text: '3', width: 2000 },
            { text: 'Vsetky 3 NEW z review #2', width: 2000 },
          ]),
          tableRow([
            { text: 'Dalsie opravy v Build #71', width: 3000 },
            { text: 'FIXED', width: 2000, color: '4CAF50' },
            { text: '8', width: 2000 },
            { text: 'Hardcoded colors, trim, useCallback, silent catches', width: 2000 },
          ]),
          tableRow([
            { text: 'Pretrvavajuce z review #1/#2', width: 3000 },
            { text: 'OPEN', width: 2000, color: 'FF9900' },
            { text: '5', width: 2000 },
            { text: 'Nezmenene', width: 2000 },
          ]),
          tableRow([
            { text: 'Nove nalezy', width: 3000 },
            { text: 'NEW', width: 2000, color: '2196F3' },
            { text: '4', width: 2000 },
            { text: '2x LOW, 2x INFO', width: 2000 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 200 } }),
      boldPara('Celkovo opravenych od review #1: ', '11 problemov (z 12 najdenych v review #1 + 3 z review #2)'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 2. STAV OPRAV Z REVIEW #2 =====
      heading('2. Stav oprav z review #2 (25. februar 2026)'),

      // 2.1 OPRAVENE z review #2
      heading('2.1 Opravene nalezy z review #2 (3/3)', HeadingLevel.HEADING_2),
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
            { text: 'Tichy catch blok v App.tsx (initialize)', width: 4000 },
            { text: 'MEDIUM', width: 1500, color: severityColor('MEDIUM') },
            { text: 'FIXED - Pridany console.warn', width: 3000, color: '4CAF50' },
          ]),
          tableRow([
            { text: '2', width: 500 },
            { text: 'Tichy catch bloky v BackupService.ts (2x)', width: 4000 },
            { text: 'MEDIUM', width: 1500, color: severityColor('MEDIUM') },
            { text: 'FIXED - Pridany console.warn do oboch', width: 3000, color: '4CAF50' },
          ]),
          tableRow([
            { text: '3', width: 500 },
            { text: 'Inline styles v App.tsx (2 miesta)', width: 4000 },
            { text: 'LOW', width: 1500, color: severityColor('LOW') },
            { text: 'FIXED - Extrahovane do StyleSheet.create', width: 3000, color: '4CAF50' },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // 2.2 DALSIE OPRAVY v Build #71
      heading('2.2 Dalsie opravy v Build #71 (mimo review #2)', HeadingLevel.HEADING_2),
      para('Okrem oprav nalezov z review #2 bolo v Build #71 implementovanych 5 dalsich vylepseni:'),
      new Paragraph({ spacing: { after: 100 } }),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: '#', width: 500 },
            { text: 'Zmena', width: 4000 },
            { text: 'Typ', width: 1500 },
            { text: 'Detail', width: 3000 },
          ], true),
          tableRow([
            { text: '4', width: 500 },
            { text: 'Hardcoded colors #FF9800 a #2196F3 v ShoppingListItem', width: 4000 },
            { text: 'FIX', width: 1500, color: '4CAF50' },
            { text: 'Presunte do theme: swipeMinus, swipeEdit', width: 3000, color: '4CAF50' },
          ]),
          tableRow([
            { text: '5', width: 500 },
            { text: 'Duplicitne trim() v AddItemInput', width: 4000 },
            { text: 'FIX', width: 1500, color: '4CAF50' },
            { text: 'Pouzita hasText premenna', width: 3000, color: '4CAF50' },
          ]),
          tableRow([
            { text: '6', width: 500 },
            { text: 'Nepotrebny useCallback na onLayout v ShoppingListItem', width: 4000 },
            { text: 'FIX', width: 1500, color: '4CAF50' },
            { text: 'Prepisane na regular function', width: 3000, color: '4CAF50' },
          ]),
          tableRow([
            { text: '7', width: 500 },
            { text: 'Tichy catch bloky v ActiveShoppingStore persist (4x)', width: 4000 },
            { text: 'FIX', width: 1500, color: '4CAF50' },
            { text: 'Pridany console.warn do vsetkych 4', width: 3000, color: '4CAF50' },
          ]),
          tableRow([
            { text: '8', width: 500 },
            { text: 'Tichy catch v ShoppingListStore persist', width: 4000 },
            { text: 'FIX', width: 1500, color: '4CAF50' },
            { text: 'Pridany console.warn', width: 3000, color: '4CAF50' },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 3. PRETRVAVAJUCE PROBLEMY =====
      heading('3. Pretrvavajuce problemy z predchadzajucich review'),
      para('Tieto problemy boli identifikovane v review #1 alebo #2 a zatial neboli opravene. Ich priorita sa nezmenila.'),
      new Paragraph({ spacing: { after: 200 } }),

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
            { text: 'OPEN - Stale monoliticky komponent', width: 3000, color: 'FF9900' },
          ]),
          tableRow([
            { text: '2', width: 500 },
            { text: 'Store persistence duplicita (3 story)', width: 4000 },
            { text: 'MEDIUM', width: 1500, color: severityColor('MEDIUM') },
            { text: 'OPEN - Rovnaky pattern bez zdielanej utility', width: 3000, color: 'FF9900' },
          ]),
          tableRow([
            { text: '3', width: 500 },
            { text: 'Mixovanie animacnych API v TutorialOverlay', width: 4000 },
            { text: 'MEDIUM', width: 1500, color: severityColor('MEDIUM') },
            { text: 'OPEN - Zamerne workaround pre iOS', width: 3000, color: 'FF9900' },
          ]),
          tableRow([
            { text: '4', width: 500 },
            { text: 'reanimated-color-picker (4.4 MB)', width: 4000 },
            { text: 'LOW', width: 1500, color: severityColor('LOW') },
            { text: 'OPEN - Stale velka kniznica pre color picker', width: 3000, color: 'FF9900' },
          ]),
          tableRow([
            { text: '5', width: 500 },
            { text: 'Magicke cisla bez dokumentacie', width: 4000 },
            { text: 'LOW', width: 1500, color: severityColor('LOW') },
            { text: 'OPEN - SWIPE_THRESHOLD=30, TOTAL_STEPS=9, HSL hodnoty', width: 3000, color: 'FF9900' },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 4. NOVE NALEZY =====
      heading('4. Nove nalezy v review #3'),

      // 4.1
      heading('4.1 Catch bloky bez debug logu v SettingsScreen.tsx (LOW)', HeadingLevel.HEADING_2),
      para('SettingsScreen.tsx riadky 139 a 152: Dva catch bloky vo funkciach handleBackup a handleRestore neobsahuju console.warn. Tieto catch bloky su ciastocne ospravedlnene, pretoze zobrazuju uzivatelovi Alert.alert s chybovou spravou, ale pre debugging by bolo uzitocne mat aj console.warn.'),
      codePara('// riadok 139 (handleBackup):'),
      codePara('} catch { Alert.alert(t("backupError"), t("backupErrorMessage")) }'),
      codePara('// riadok 152 (handleRestore):'),
      codePara('} catch { Alert.alert(t("restoreError"), t("restoreErrorMessage")) }'),
      para('Odporucanie: Pridat console.warn pred Alert.alert pre konzistenciu s ostatnymi catch blokmi.'),
      new Paragraph({ spacing: { after: 200 } }),

      // 4.2
      heading('4.2 Limitovane locale v formatDate (LOW)', HeadingLevel.HEADING_2),
      para('ShoppingHistoryScreen.tsx riadok 159: Funkcia formatDate podporuje len 2 locales - "sk" (slovensky format) a default "en-US". Aplikacia ma 12 jazykov, ale vsetky okrem slovenciny pouzivaju anglicky format datumovania.'),
      codePara('function formatDate(dateString: string): string {'),
      codePara('  const locale = i18n.language === "sk" ? "sk-SK" : "en-US"'),
      codePara('  return new Date(dateString).toLocaleDateString(locale, { ... })'),
      codePara('}'),
      para('Odporucanie: Mapovat vsetky jazyky na spravne locale kody (napr. "de" -> "de-DE", "fr" -> "fr-FR", "hu" -> "hu-HU" atd.) alebo pouzit priamo i18n.language s fallback.'),
      new Paragraph({ spacing: { after: 200 } }),

      // 4.3
      heading('4.3 Konzistencia locale suborov (INFO)', HeadingLevel.HEADING_2),
      para('Vsetky 12 locale suborov su konzistentne. Rozdiely v pocte klucov su ocakavane a spravne:'),
      bullet('Slovanske jazyky (sk, cs, pl, uk): +2 kluce (_few formy pre pluralizaciu)'),
      bullet('Cinstina (zh): -2 kluce (_one formy nie su potrebne)'),
      bullet('Ostatne jazyky (de, en, es, fr, hu, it, pt): zhodne kluce'),
      para('Ziadne chybajuce preklady. Vsetky texty su prelozene vo vsetkych jazykoch.'),
      new Paragraph({ spacing: { after: 200 } }),

      // 4.4
      heading('4.4 Neoptimalizovane ikony (INFO)', HeadingLevel.HEADING_2),
      para('icon.png a adaptive-icon.png su obe 760 KB, co je vysoko nad optimalnou velkostou 50-100 KB pre app ikony. Odporucame optimalizovat cez TinyPNG alebo podobny nastroj.'),
      para('Toto bolo uz zmienene v review #2 (sekcia Assets) a zatial nebolo opravene.'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 5. ANALYZA ZAVISLOSTI =====
      heading('5. Analyza zavislosti'),

      heading('5.1 Statistiky', HeadingLevel.HEADING_2),
      boldPara('Production dependencies: ', '28 (nezmenene od review #2)'),
      boldPara('Dev dependencies: ', '7 (nezmenene od review #2)'),
      boldPara('Velkost node_modules: ', '605 MB (nezmenene od review #2)'),
      new Paragraph({ spacing: { after: 200 } }),

      heading('5.2 Top 10 podla velkosti', HeadingLevel.HEADING_2),
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

      heading('5.3 Dev dependencies (nemaju vplyv na bundle)', HeadingLevel.HEADING_2),
      bullet('googleapis (171 MB) - len pre Google Play publish skript'),
      bullet('puppeteer (200+ MB) - len pre screenshot skripty'),
      bullet('sharp - len pre generovanie grafiky'),
      bullet('docx - len pre generovanie code review'),
      bullet('Odporucanie: Zvazit presun do samostatneho package.json v scripts/'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 6. ANALYZA I18N =====
      heading('6. Analyza i18n'),

      heading('6.1 Statistiky', HeadingLevel.HEADING_2),
      boldPara('Pocet jazykov: ', '12'),
      boldPara('Kluce v EN: ', '118'),
      boldPara('Celkova velkost locale suborov: ', '69 KB'),
      new Paragraph({ spacing: { after: 200 } }),

      heading('6.2 Konzistencia klucov', HeadingLevel.HEADING_2),
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

      // ===== 7. ANALYZA ASSETS =====
      heading('7. Analyza assets'),
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
          tableRow([{ text: 'favicon.png', width: 3000 }, { text: '6 KB', width: 3000 }, { text: 'OK', width: 3000 }]),
          tableRow([{ text: 'CELKOM', width: 3000 }, { text: '1.6 MB', width: 3000 }, { text: 'Potencialna uspora ~1.2 MB optimalizaciou ikon', width: 3000 }]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 8. STRUKTURA ZDROJOVEHO KODU =====
      heading('8. Struktura zdrojoveho kodu'),

      heading('8.1 Subory podla velkosti', HeadingLevel.HEADING_2),
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
      boldPara('Celkovy pocet zdrojovych suborov: ', '24'),
      boldPara('Celkovy pocet zdrojovych riadkov: ', '~4,471'),
      new Paragraph({ spacing: { after: 200 } }),

      heading('8.2 Zmeny od review #2', HeadingLevel.HEADING_2),
      bullet('Vsetky 3 nalezy z review #2 opravene'),
      bullet('Hardcoded farby v ShoppingListItem presunte do theme (swipeMinus, swipeEdit)'),
      bullet('Duplicitne trim() v AddItemInput nahradene hasText premennou'),
      bullet('Nepotrebny useCallback v ShoppingListItem nahradeny regular function'),
      bullet('Tichy catch bloky v ActiveShoppingStore (4x) a ShoppingListStore (1x) doplnene o console.warn'),
      bullet('Inline styles v App.tsx extrahovane do StyleSheet.create'),
      bullet('Celkovo 11 problemov opravenych od prveho review'),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 9. ODPORUCANIA =====
      heading('9. Odporucania na dalsie vylepsenia (prioritizovane)'),

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
            { text: 'Pridat console.warn do SettingsScreen catch blokov (riadky 139, 152)', width: 5000 },
            { text: 'Konzistencia debug logu', width: 3500 },
          ]),
          tableRow([
            { text: '2', width: 500 },
            { text: 'Rozsirit formatDate o vsetky locale (12 jazykov)', width: 5000 },
            { text: 'Spravne formatovanie datumov', width: 3500 },
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
            { text: '6', width: 500 },
            { text: 'Rozdelit TutorialOverlay do viacerych suborov', width: 5000 },
            { text: 'Udrzovatelnost', width: 3500 },
          ]),
          tableRow([
            { text: '7', width: 500 },
            { text: 'Zvazit nahradenie reanimated-color-picker', width: 5000 },
            { text: '-4.4 MB', width: 3500 },
          ]),
          tableRow([
            { text: '8', width: 500 },
            { text: 'Presunnut build skripty do samostatneho package.json', width: 5000 },
            { text: 'Rychlejsi npm install', width: 3500 },
          ]),
          tableRow([
            { text: '9', width: 500 },
            { text: 'Zjednotit animacne API v TutorialOverlay na Reanimated', width: 5000 },
            { text: 'Konzistencia', width: 3500 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 400 } }),

      // ===== 10. CELKOVE HODNOTENIE =====
      heading('10. Celkove hodnotenie'),
      para('Kvalita kodu sa od druheho review udrzala na urovni GOOD a doslo k dalsim vylepsenim. Vsetky 3 nalezy z review #2 boli opravene a navyse bolo implementovanych 5 dalsich oprav (hardcoded colors, duplicitne trim, nepotrebny useCallback, tichy catch bloky v storoch). Celkovo bolo od prveho review opravanych 11 zo 15 identifikovanych problemov.'),
      new Paragraph({ spacing: { after: 200 } }),

      heading('10.1 Statistiky tichych catch blokov', HeadingLevel.HEADING_2),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: 'Review', width: 2500 },
            { text: 'Pocet', width: 2000 },
            { text: 'Detail', width: 4500 },
          ], true),
          tableRow([
            { text: 'Review #1', width: 2500 },
            { text: '8', width: 2000 },
            { text: 'Vsetky bez akehokolvek logu', width: 4500 },
          ]),
          tableRow([
            { text: 'Review #2', width: 2500 },
            { text: '3', width: 2000 },
            { text: 'App.tsx (1x), BackupService.ts (2x) - bez logu', width: 4500 },
          ]),
          tableRow([
            { text: 'Review #3', width: 2500 },
            { text: '2*', width: 2000 },
            { text: 'SettingsScreen.tsx (2x) - ale maju Alert.alert pre uzivatela', width: 4500 },
          ]),
        ],
      }),
      new Paragraph({ spacing: { after: 200 } }),
      para('* Zostave 2 catch bloky v SettingsScreen.tsx su ciastocne ospravedlnene, pretoze zobrazuju uzivatelovi chybovu hlasku cez Alert.alert. Chyba len debug log (console.warn).'),
      new Paragraph({ spacing: { after: 300 } }),

      boldPara('Celkove hodnotenie: ', 'GOOD (stabilne od review #2, 11 dalsich oprav aplikovanych)'),
      new Paragraph({ spacing: { after: 200 } }),

      heading('10.2 Porovnanie napriec review', HeadingLevel.HEADING_2),
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          tableRow([
            { text: 'Metrika', width: 2000 },
            { text: 'Review #1 (24.2.)', width: 1750 },
            { text: 'Review #2 (25.2.)', width: 1750 },
            { text: 'Review #3 (25.2.)', width: 1750 },
            { text: 'Celkova zmena', width: 1750 },
          ], true),
          tableRow([
            { text: 'Production deps', width: 2000 },
            { text: '31', width: 1750 },
            { text: '28', width: 1750 },
            { text: '28', width: 1750 },
            { text: '-3', width: 1750 },
          ]),
          tableRow([
            { text: 'node_modules', width: 2000 },
            { text: '663 MB', width: 1750 },
            { text: '605 MB', width: 1750 },
            { text: '605 MB', width: 1750 },
            { text: '-58 MB', width: 1750 },
          ]),
          tableRow([
            { text: 'Tichy error handling', width: 2000 },
            { text: '8 miest', width: 1750 },
            { text: '3 miesta', width: 1750 },
            { text: '2 miesta*', width: 1750 },
            { text: '-6 (*user-facing)', width: 1750 },
          ]),
          tableRow([
            { text: 'Nepouzite deps', width: 2000 },
            { text: '2 (CRITICAL)', width: 1750, color: severityColor('CRITICAL') },
            { text: '0', width: 1750 },
            { text: '0', width: 1750 },
            { text: 'Opravene', width: 1750, color: '4CAF50' },
          ]),
          tableRow([
            { text: 'Hardcoded colors', width: 2000 },
            { text: '2', width: 1750 },
            { text: '2', width: 1750 },
            { text: '0', width: 1750 },
            { text: 'Opravene', width: 1750, color: '4CAF50' },
          ]),
          tableRow([
            { text: 'Inline styles', width: 2000 },
            { text: '2', width: 1750 },
            { text: '2', width: 1750 },
            { text: '0', width: 1750 },
            { text: 'Opravene', width: 1750, color: '4CAF50' },
          ]),
          tableRow([
            { text: 'Celkove hodnotenie', width: 2000 },
            { text: 'NEEDS CHANGES', width: 1750, color: 'FF9900' },
            { text: 'GOOD', width: 1750, color: '4CAF50' },
            { text: 'GOOD', width: 1750, color: '4CAF50' },
            { text: 'Stabilne', width: 1750, color: '4CAF50' },
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
const outputPath = path.join(outputDir, '2026-02-25-code-review-v1.2.0-b71.docx')
fs.writeFileSync(outputPath, buffer)
console.log(`Code review document saved to: ${outputPath}`)
