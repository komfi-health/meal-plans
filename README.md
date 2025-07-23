# PDF Generátor Jídelníčků

Systém pro generování PDF jídelníčků z dat v Airtable. Podporuje lokální vývoj i cloudové nasazení přes Netlify Functions.

## 🚀 Jak to funguje

### Lokální vývoj
```
Airtable → Node.js Script → PDF → Lokální soubory
```

### Produkce (Netlify)
```
Airtable → Netlify Functions → PDF → Airtable Attachment
```

1. **Airtable Script** spustí proces generování
2. **PDF generátor** zpracuje požadavek:
   - Načte data z Airtable
   - Vygeneruje PDF pomocí Puppeteer
   - Uloží PDF lokálně nebo zpět do Airtable
3. **PDF je dostupné** jako soubor nebo příloha

## 📁 Struktura projektu

```
meal-plans/
├── netlify/
│   └── functions/              # Netlify serverless funkce
│       ├── generate-pdf.js     # Generuje PDF z dat
│       ├── pdf-save.js         # Ukládá URL do Airtable
│       └── download-pdf.js     # Endpoint pro stažení PDF
├── templates/
│   └── jidelnicek.html         # HTML šablona pro PDF
├── pdf/
│   ├── originals/              # Originální PDF (backup)
│   └── *.pdf                   # Zkomprimované PDF (~1MB)
├── arch/                       # Archivované soubory
├── img/
│   ├── meals/                  # Obrázky jídel (PNG)
│   └── logos/                  # Loga (SVG)
├── fonts/                      # Fonty (Gambarino, Satoshi)
├── scripts pro lokální vývoj:
│   ├── generate-improved-pdf.js    # Hlavní generátor PDF
│   ├── generate_all_pdfs.js        # Batch generování všech PDF
│   ├── airtable-pdf-generation-script.js  # Airtable script
│   └── compress_all_final.sh       # Komprese PDF
├── package.json                # Závislosti
├── netlify.toml               # Konfigurace Netlify
└── README.md                  # Tento soubor
```

## 🔧 Technologie

- **Netlify Functions** - Serverless backend
- **Puppeteer** - Generování PDF z HTML
- **Handlebars** - Šablonování HTML
- **Airtable API** - Čtení dat a ukládání PDF
- **Node.js 18+** - Runtime

## 🛠️ Instalace a nastavení

### 1. Lokální vývoj
```bash
# Klonování repozitáře
git clone https://github.com/komfi-health/meal-plans.git
cd meal-plans

# Instalace závislostí
npm install

# Vytvoření .env souboru pro Airtable přístup
echo "AIRTABLE_API_KEY=your_key" >> .env
echo "AIRTABLE_BASE_ID=your_base_id" >> .env
```

### 2. Lokální generování PDF
```bash
# Generování jednotlivého PDF
node generate-improved-pdf.js

# Generování všech PDF ze všech záznamů
node generate_all_pdfs.js

# Komprese PDF (zachovává obrázky, cílí ~1MB)
./compress_all_final.sh
```

### 3. Deploy na Netlify (produkce)
1. Pushněte kód na GitHub
2. Připojte GitHub repo v Netlify
3. Nastavte environment variables:
   - `AIRTABLE_API_KEY`
   - `AIRTABLE_BASE_ID`

### 4. Airtable nastavení
1. Vytvořte Personal Access Token
2. Přidejte pole typu "Attachment" pro PDF
3. Nainstalujte Scripting Extension

## 📝 Použití

### Lokální workflow
```bash
# 1. Načtěte nejnovější data z Airtable a vygenerujte PDF
node generate_all_pdfs.js

# 2. Zkomprimujte PDF pro optimální velikost (~1MB)
./compress_all_final.sh

# 3. PDF jsou k dispozici ve složce pdf/
ls -la pdf/*.pdf
```

### Airtable Script (pro Netlify produkci)
```javascript
// Vložte do Airtable Scripting Extension
const NETLIFY_FUNCTION_URL = 'https://kmfi-meals.netlify.app/.netlify/functions/pdf-save';
const ID_CIRCUIT = 'EXTRA_000'; // ID záznamu

// Script automaticky:
// 1. Zavolá Netlify funkci
// 2. Vygeneruje PDF
// 3. Uloží URL do attachment pole
```

### Struktura dat v Airtable
Tabulka musí obsahovat tyto sloupce:
- `ID Circuit` - Unikátní identifikátor
- `Klient` - Jméno klienta
- `Datum rozvozu` - Datum doručení
- `Den` - Číslo dne (1-7)
- `Název jídla` - Název jídla (obsahuje OBĚD/VEČEŘE)
- `Položka` - Ingredience
- `Poměr` - Množství
- `Instrukce` - Návod k přípravě
- `PDF Jídelníček` - Attachment pole pro PDF

## 🔄 Workflow

1. **Spuštění generování**
   ```
   Airtable Script → POST /pdf-save
   ```

2. **Generování PDF**
   ```
   pdf-save → generate-pdf → Puppeteer → Base64 PDF
   ```

3. **Uložení do Airtable**
   ```
   pdf-save → Airtable API → Update record s URL
   ```

4. **Stažení PDF**
   ```
   Airtable Attachment → GET /download-pdf?id=XXX → PDF
   ```

## 🔌 API Endpoints

### POST `/generate-pdf`
Generuje PDF z dat
```json
{
  "recordId": "EXTRA_000",
  "tableName": "tblCHxatBEyaspzR3"
}
```

### POST `/pdf-save`
Generuje PDF a ukládá URL do Airtable
```json
{
  "recordId": "EXTRA_000",
  "airtableRecordId": "recXXXXXXXXXXXXXX"
}
```

### GET `/download-pdf?id=EXTRA_000`
Stáhne PDF pro daný záznam

## 📝 Konfigurace šablony jídelníčku

- **Formát:** `<počet dní>x<typy jídel>`
- **Příklad:** `5xO` znamená 5 dní, pouze obědy. `4xO-V` znamená 4 dny, oběd a večeře.
- **Typy jídel:**
  - `S` = snídaně
  - `SV1` = dopolední svačina
  - `O` = oběd
  - `SV2` = odpolední svačina
  - `V` = večeře

Šablona se dynamicky přizpůsobí podle této konfigurace – počet dní i typy jídel v jednotlivých dnech.

## 📝 Varianty šablon a layoutů generovaných jídelníčků

Generovaný layout jídelníčku má několik verzí podle typu šablony a počtu dní/typů jídel:

- **Velké/větší karty (např. 5xO, 6xO, 7xO):**
  - Pouze jeden typ jídla (typicky oběd) na den.
  - V každé kartě dne je velký obrázek jídla a jeho název.
  - Veškerý obsah se vejde na 1 A4.

- **Standardní karty s obrázky a více typy jídel (např. 5xO-V):**
  - Více typů jídel pod sebou v rámci jednoho dne (např. oběd, večeře).
  - U každé ingredience je uveden poměr a popis přípravy.
  - Text může být menší, vše se opět vejde na 1 A4.

- **Pouze textové jídelníčky (více typů jídel/den, více dní):**
  - Neobsahují obrázky jídel (kvůli místu).
  - Text je menší, při 4+ typech jídel na den a/nebo 6+ dnech se využívá i druhá strana A4.

### Další poznámky k layoutu
- Karty dnů s jídly nikdy nezasahují do hlavičky ani patičky.
- Pokud je jídelníček příliš dlouhý, pokračuje na druhé straně.
- Typ jídla (oběd, snídaně, ...) je vždy u jídla zobrazen.
- Název daného jídla se zobrazuje pouze jednou (např. "Katův šleh z vepřového masa, rýže").
- Pro jídla z více ingrediencí je v Airtable datech název jídla pouze u jedné z nich – ten je potřeba použít.
- Pokud chybí obrázek jídla a má v šabloně být, použije se placeholder z `img/meals/placeholders`.
- Informace v patičce se načítají ze separátního HTML pro snadnější editaci.

## ⚡ Optimalizace a komprese

### PDF komprese
- **Původní velikost**: 2-4MB na PDF
- **Po kompresi**: ~0.7-1.1MB na PDF
- **Zachovávají se obrázky** v dobré kvalitě
- **Ghostscript nastavení**: JPEG kvalita 75%, auto filtering

### Kompresní script
```bash
# Spustí kompresi všech PDF v pdf/ složce
./compress_all_final.sh

# Nastavení komprese (v scriptu):
# - Bez downsamplingu obrázků
# - JPEG kvalita 75%
# - Automatická filtrace barev
# - Optimalizace PDF struktury
```

### Performance
- Lokální generování: ~2-3s na PDF
- Netlify Functions: ~5-10s na PDF (cold start)
- HTML šablona je vložena přímo v kódu (rychlejší)
- Puppeteer používá optimalizovaný Chromium


## 🐛 Řešení problémů

### PDF se negeneruje
1. Zkontrolujte logs v Netlify Functions
2. Ověřte environment variables
3. Zkontrolujte, že záznam existuje v Airtable

### Chyba autorizace
- Ověřte, že Airtable token má správná oprávnění
- Zkontrolujte, že base ID je správné

### PDF není v příloze
- Ověřte ID pole pro attachment
- Zkontrolujte oprávnění tokenu pro zápis

## 📄 Licence

Interní projekt společnosti Komfi Health.

## 👥 Kontakt

Pro podporu kontaktujte: lubos@komfi.health
