import { google } from 'googleapis'
import { readFileSync, createReadStream } from 'fs'
import { resolve } from 'path'

// ============================================================================
// Configuration
// ============================================================================

const PACKAGE_NAME = 'com.realise.onegoshop'
const SERVICE_ACCOUNT_PATH = resolve('./internals/google-play/service-account.json')
const AAB_PATH = resolve('./internals/google-play/app.aab')

const CONTACT_EMAIL = 'matray@realise.sk'
const CONTACT_WEBSITE = 'https://realise.sk'
const DEFAULT_LOCALE = 'en-US'

// ============================================================================
// Store Listing Translations
// ============================================================================

const LISTINGS = {
  'en-US': {
    title: '1GoShop',
    shortDescription: 'Simple one-tap shopping list with history, export & 12 languages.',
    fullDescription: `1GoShop is a simple and fast shopping list app. Add items, check them off, and start shopping with one tap.

Features:
• One-tap shopping: mark items and start shopping instantly
• Swipe gestures: swipe to edit, delete, or change quantity
• Shopping history: track completed trips and statistics
• Data backup: export and import your data
• Clipboard import/export: paste lists from notes, spreadsheets
• Customizable accent color
• Dark mode support
• 12 languages: Slovak, English, German, Hungarian, Ukrainian, Czech, Chinese, Spanish, French, Italian, Polish, Portuguese

How it works:
1. Add items to your shopping list
2. Tap items to mark them for shopping
3. Hit the green button to start
4. Check off items as you buy them
5. Finish and save to history

Your data is stored locally on your device with cloud backup support.`,
  },
  'sk': {
    title: '1GoShop',
    shortDescription: 'Jednoduchý nákupný zoznam na jedno klepnutie s históriou a 12 jazykmi.',
    fullDescription: `1GoShop je jednoduchá a rýchla aplikácia na nákupný zoznam. Pridajte položky, označte ich a začnite nakupovať jedným klepnutím.

Funkcie:
• Nákup na jedno klepnutie: označte položky a začnite nakupovať okamžite
• Gestá: potiahnutím upravíte, vymažete alebo zmeníte množstvo
• História nákupov: sledujte dokončené nákupy a štatistiky
• Záloha dát: exportujte a importujte vaše dáta
• Import/export zo schránky: vložte zoznamy z poznámok, tabuliek
• Prispôsobiteľná farba aplikácie
• Podpora tmavého režimu
• 12 jazykov: slovenčina, angličtina, nemčina, maďarčina, ukrajinčina, čeština, čínština, španielčina, francúzština, taliančina, poľština, portugalčina

Ako to funguje:
1. Pridajte položky do nákupného zoznamu
2. Klepnite na položky pre označenie na nákup
3. Stlačte zelené tlačidlo pre začiatok nákupu
4. Odškrtávajte položky počas nakupovania
5. Ukončite a uložte do histórie

Vaše dáta sú uložené lokálne na zariadení s podporou cloudovej zálohy.`,
  },
  'de-DE': {
    title: '1GoShop',
    shortDescription: 'Einfache Einkaufsliste mit einem Tippen, Verlauf und 12 Sprachen.',
    fullDescription: `1GoShop ist eine einfache und schnelle Einkaufslisten-App. Fügen Sie Artikel hinzu, haken Sie sie ab und beginnen Sie mit einem Tippen einzukaufen.

Funktionen:
• Einkauf mit einem Tippen: Artikel markieren und sofort einkaufen
• Wischgesten: wischen zum Bearbeiten, Löschen oder Ändern der Menge
• Einkaufsverlauf: abgeschlossene Einkäufe und Statistiken verfolgen
• Datensicherung: Daten exportieren und importieren
• Zwischenablage Import/Export: Listen aus Notizen, Tabellen einfügen
• Anpassbare Akzentfarbe
• Dunkelmodus-Unterstützung
• 12 Sprachen

Ihre Daten werden lokal auf Ihrem Gerät mit Cloud-Backup-Unterstützung gespeichert.`,
  },
  'hu-HU': {
    title: '1GoShop',
    shortDescription: 'Egyszerű bevásárlólista egy érintéssel, előzményekkel és 12 nyelvvel.',
    fullDescription: `Az 1GoShop egy egyszerű és gyors bevásárlólista alkalmazás. Adjon hozzá tételeket, pipálja ki őket, és kezdjen vásárolni egyetlen érintéssel.

Funkciók:
• Vásárlás egy érintéssel: jelölje meg a tételeket és kezdjen azonnal vásárolni
• Húzó mozdulatok: húzással szerkeszt, töröl vagy módosít mennyiséget
• Vásárlási előzmények: befejezett vásárlások és statisztikák követése
• Adatmentés: adatok exportálása és importálása
• Vágólap import/export: listák beillesztése jegyzetekből, táblázatokból
• Testreszabható alkalmazásszín
• Sötét mód támogatás
• 12 nyelv

Az adatok helyben, az eszközön tárolódnak, felhő mentés támogatással.`,
  },
  'uk': {
    title: '1GoShop',
    shortDescription: 'Простий список покупок одним дотиком з історією та 12 мовами.',
    fullDescription: `1GoShop — це проста та швидка програма для списку покупок. Додавайте товари, відмічайте їх та починайте покупки одним дотиком.

Функції:
• Покупки одним дотиком: позначте товари та починайте покупки миттєво
• Жести: проведіть для редагування, видалення або зміни кількості
• Історія покупок: відстежуйте завершені покупки та статистику
• Резервне копіювання: експорт та імпорт даних
• Імпорт/експорт з буфера обміну: вставляйте списки з нотаток, таблиць
• Налаштовуваний колір акценту
• Підтримка темного режиму
• 12 мов

Ваші дані зберігаються локально на пристрої з підтримкою хмарного резервного копіювання.`,
  },
  'cs-CZ': {
    title: '1GoShop',
    shortDescription: 'Jednoduchý nákupní seznam na jedno klepnutí s historií a 12 jazyky.',
    fullDescription: `1GoShop je jednoduchá a rychlá aplikace pro nákupní seznam. Přidejte položky, odškrtněte je a začněte nakupovat jedním klepnutím.

Funkce:
• Nákup na jedno klepnutí: označte položky a začněte nakupovat okamžitě
• Gesta: přejetím upravíte, smažete nebo změníte množství
• Historie nákupů: sledujte dokončené nákupy a statistiky
• Záloha dat: exportujte a importujte vaše data
• Import/export ze schránky: vložte seznamy z poznámek, tabulek
• Přizpůsobitelná barva aplikace
• Podpora tmavého režimu
• 12 jazyků

Vaše data jsou uložena lokálně na zařízení s podporou cloudové zálohy.`,
  },
  'zh-CN': {
    title: '1GoShop',
    shortDescription: '简单的一键购物清单，支持历史记录、导出和12种语言。',
    fullDescription: `1GoShop 是一款简单快速的购物清单应用。添加物品，勾选它们，一键开始购物。

功能：
• 一键购物：标记物品后立即开始购物
• 滑动手势：滑动编辑、删除或更改数量
• 购物历史：跟踪已完成的购物和统计数据
• 数据备份：导出和导入数据
• 剪贴板导入/导出：从备忘录、电子表格粘贴列表
• 可自定义主题色
• 深色模式支持
• 12种语言

您的数据存储在设备本地，支持云备份。`,
  },
  'es-ES': {
    title: '1GoShop',
    shortDescription: 'Lista de compras simple con un toque, historial, exportación y 12 idiomas.',
    fullDescription: `1GoShop es una aplicación de lista de compras simple y rápida. Añade artículos, márcalos y empieza a comprar con un solo toque.

Características:
• Compras con un toque: marca artículos y empieza a comprar al instante
• Gestos de deslizamiento: desliza para editar, eliminar o cambiar cantidad
• Historial de compras: rastrea compras completadas y estadísticas
• Copia de seguridad: exporta e importa tus datos
• Importar/exportar del portapapeles: pega listas desde notas, hojas de cálculo
• Color de acento personalizable
• Soporte de modo oscuro
• 12 idiomas

Tus datos se almacenan localmente en tu dispositivo con soporte de copia de seguridad en la nube.`,
  },
  'fr-FR': {
    title: '1GoShop',
    shortDescription: 'Liste de courses simple en un geste, historique, export et 12 langues.',
    fullDescription: `1GoShop est une application de liste de courses simple et rapide. Ajoutez des articles, cochez-les et commencez vos courses en un seul geste.

Fonctionnalités :
• Courses en un geste : marquez les articles et commencez à acheter instantanément
• Gestes de balayage : balayez pour modifier, supprimer ou changer la quantité
• Historique des courses : suivez les courses terminées et les statistiques
• Sauvegarde des données : exportez et importez vos données
• Import/export du presse-papiers : collez des listes depuis vos notes, tableurs
• Couleur d'accentuation personnalisable
• Support du mode sombre
• 12 langues

Vos données sont stockées localement sur votre appareil avec support de sauvegarde cloud.`,
  },
  'it-IT': {
    title: '1GoShop',
    shortDescription: 'Lista della spesa semplice con un tocco, cronologia, export e 12 lingue.',
    fullDescription: `1GoShop è un'applicazione per la lista della spesa semplice e veloce. Aggiungi articoli, spuntali e inizia a fare la spesa con un solo tocco.

Caratteristiche:
• Spesa con un tocco: seleziona gli articoli e inizia a comprare subito
• Gesti di scorrimento: scorri per modificare, eliminare o cambiare quantità
• Cronologia spese: tieni traccia delle spese completate e delle statistiche
• Backup dei dati: esporta e importa i tuoi dati
• Import/export dagli appunti: incolla liste da note, fogli di calcolo
• Colore dell'applicazione personalizzabile
• Supporto modalità scura
• 12 lingue

I tuoi dati sono archiviati localmente sul dispositivo con supporto backup cloud.`,
  },
  'pl-PL': {
    title: '1GoShop',
    shortDescription: 'Prosta lista zakupów jednym dotknięciem z historią, eksportem i 12 językami.',
    fullDescription: `1GoShop to prosta i szybka aplikacja do listy zakupów. Dodawaj produkty, zaznaczaj je i rozpoczynaj zakupy jednym dotknięciem.

Funkcje:
• Zakupy jednym dotknięciem: oznacz produkty i zacznij kupować natychmiast
• Gesty przesuwania: przesuń, aby edytować, usunąć lub zmienić ilość
• Historia zakupów: śledź ukończone zakupy i statystyki
• Kopia zapasowa danych: eksportuj i importuj dane
• Import/eksport ze schowka: wklej listy z notatek, arkuszy kalkulacyjnych
• Konfigurowalny kolor akcentu
• Obsługa trybu ciemnego
• 12 języków

Twoje dane są przechowywane lokalnie na urządzeniu z obsługą kopii zapasowej w chmurze.`,
  },
  'pt-PT': {
    title: '1GoShop',
    shortDescription: 'Lista de compras simples com um toque, histórico, exportação e 12 idiomas.',
    fullDescription: `1GoShop é uma aplicação de lista de compras simples e rápida. Adicione itens, marque-os e comece as compras com um único toque.

Características:
• Compras com um toque: marque itens e comece a comprar instantaneamente
• Gestos de deslizar: deslize para editar, eliminar ou alterar quantidade
• Histórico de compras: acompanhe compras concluídas e estatísticas
• Cópia de segurança: exporte e importe os seus dados
• Importar/exportar da área de transferência: cole listas de notas, folhas de cálculo
• Cor de destaque personalizável
• Suporte de modo escuro
• 12 idiomas

Os seus dados são armazenados localmente no dispositivo com suporte de cópia de segurança na nuvem.`,
  },
}

// ============================================================================
// Screenshot paths
// ============================================================================

const SCREENSHOT_DIR = resolve('./appstore-screenshots')

// ============================================================================
// Auth & API setup
// ============================================================================

async function getApi() {
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  })
  return google.androidpublisher({ version: 'v3', auth })
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('==============================================')
  console.log('  Google Play - Store Listing & Release Upload')
  console.log('  Package: ' + PACKAGE_NAME)
  console.log('==============================================')

  const api = await getApi()

  // --- Create edit ---
  console.log('\n[EDIT] Creating edit...')
  const editRes = await api.edits.insert({ packageName: PACKAGE_NAME })
  const editId = editRes.data.id
  console.log(`[EDIT] Created: ${editId}`)

  try {
    // --- Upload AAB (skip if already uploaded) ---
    let versionCode
    try {
      console.log('\n[AAB] Uploading AAB...')
      const uploadRes = await api.edits.bundles.upload({
        packageName: PACKAGE_NAME,
        editId,
        media: {
          mimeType: 'application/octet-stream',
          body: createReadStream(AAB_PATH),
        },
      })
      versionCode = uploadRes.data.versionCode
      console.log(`[AAB] Uploaded. Version code: ${versionCode}`)
    } catch (err) {
      if (err.message?.includes('already been used')) {
        console.log('[AAB] Already uploaded. Checking existing bundles...')
        const bundlesRes = await api.edits.bundles.list({
          packageName: PACKAGE_NAME,
          editId,
        })
        const bundles = bundlesRes.data.bundles || []
        versionCode = bundles[bundles.length - 1]?.versionCode
        console.log(`[AAB] Using existing version code: ${versionCode}`)
      } else {
        throw err
      }
    }

    // --- Set track (internal testing) ---
    console.log('\n[TRACK] Setting internal track...')
    await api.edits.tracks.update({
      packageName: PACKAGE_NAME,
      editId,
      track: 'internal',
      requestBody: {
        track: 'internal',
        releases: [
          {
            versionCodes: [String(versionCode)],
            status: 'draft',
            releaseNotes: [
              { language: 'en-US', text: 'Initial release with 12 languages, shopping list, history, backup, and dark mode.' },
              { language: 'sk', text: 'Prvé vydanie s 12 jazykmi, nákupný zoznam, história, záloha a tmavý režim.' },
            ],
          },
        ],
      },
    })
    console.log('[TRACK] Internal track set.')

    // --- Store listings ---
    console.log('\n[LISTINGS] Setting store listings...')
    for (const [locale, listing] of Object.entries(LISTINGS)) {
      try {
        await api.edits.listings.update({
          packageName: PACKAGE_NAME,
          editId,
          language: locale,
          requestBody: {
            language: locale,
            title: listing.title,
            shortDescription: listing.shortDescription,
            fullDescription: listing.fullDescription,
          },
        })
        console.log(`  [LISTINGS] ${locale}: OK`)
      } catch (err) {
        console.error(`  [LISTINGS] ${locale}: FAILED - ${err.message}`)
      }
    }

    // --- Upload screenshots (EN) ---
    console.log('\n[SCREENSHOTS] Uploading EN screenshots...')
    const enScreenshotDir = resolve(SCREENSHOT_DIR, 'EN/6.7')
    for (let i = 1; i <= 4; i++) {
      const num = String(i).padStart(2, '0')
      const filePath = resolve(enScreenshotDir, `en_${num}.png`)
      try {
        await api.edits.images.upload({
          packageName: PACKAGE_NAME,
          editId,
          language: 'en-US',
          imageType: 'phoneScreenshots',
          media: {
            mimeType: 'image/png',
            body: createReadStream(filePath),
          },
        })
        console.log(`  [SCREENSHOTS] en-US phone en_${num}.png: OK`)
      } catch (err) {
        console.error(`  [SCREENSHOTS] en-US phone en_${num}.png: FAILED - ${err.message}`)
      }
    }

    // --- Upload screenshots (SK) ---
    console.log('\n[SCREENSHOTS] Uploading SK screenshots...')
    const skScreenshotDir = resolve(SCREENSHOT_DIR, 'SK/6.7')
    for (let i = 1; i <= 4; i++) {
      const num = String(i).padStart(2, '0')
      const filePath = resolve(skScreenshotDir, `${num}.png`)
      try {
        await api.edits.images.upload({
          packageName: PACKAGE_NAME,
          editId,
          language: 'sk',
          imageType: 'phoneScreenshots',
          media: {
            mimeType: 'image/png',
            body: createReadStream(filePath),
          },
        })
        console.log(`  [SCREENSHOTS] sk phone ${num}.png: OK`)
      } catch (err) {
        console.error(`  [SCREENSHOTS] sk phone ${num}.png: FAILED - ${err.message}`)
      }
    }

    // --- Commit edit ---
    console.log('\n[COMMIT] Committing edit...')
    await api.edits.commit({
      packageName: PACKAGE_NAME,
      editId,
    })
    console.log('[COMMIT] Done! All changes published.')

  } catch (err) {
    console.error('\n[ERROR] Rolling back edit...')
    try {
      await api.edits.delete({ packageName: PACKAGE_NAME, editId })
    } catch {}
    throw err
  }

  console.log('\n==============================================')
  console.log('  DONE! Store listing and AAB uploaded.')
  console.log('  Next steps (manual in Play Console):')
  console.log('  1. App content > Content rating')
  console.log('  2. App content > Data safety')
  console.log('  3. App content > Target audience')
  console.log('  4. Store settings > App category')
  console.log('  5. Promote to production when ready')
  console.log('==============================================')
}

main().catch(err => {
  console.error('\n[FATAL ERROR]', err.message)
  if (err.errors) console.error(JSON.stringify(err.errors, null, 2))
  process.exit(1)
})
