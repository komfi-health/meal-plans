# PDF Generátor Jídelníčků

Automatický systém pro generování PDF jídelníčků z dat v Airtable.

## 🚀 Jak to funguje

### Architektura
```
Airtable → Netlify Functions → PDF → Airtable Attachment
```

1. **Airtable Script** spustí proces generování
2. **Netlify Functions** zpracují požadavek:
   - Načtou data z Airtable
   - Vygenerují PDF pomocí Puppeteer
   - Uloží odkaz zpět do Airtable
3. **PDF je dostupné** jako příloha v záznamu

## 📁 Struktura projektu

```
meal-plans/
├── netlify/
│   └── functions/
│       ├── generate-pdf.js      # Generuje PDF z dat
│       ├── pdf-save.js          # Ukládá URL do Airtable
│       ├── download-pdf.js      # Endpoint pro stažení PDF
│       └── test.js              # Test endpoint
├── templates/
│   └── jidelnicek.html          # HTML šablona pro PDF
├── package.json                 # Závislosti
├── netlify.toml                 # Konfigurace Netlify
└── README.md                    # Tento soubor
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

# Vytvoření .env souboru
echo "AIRTABLE_API_KEY=your_key" >> .env
echo "AIRTABLE_BASE_ID=your_base_id" >> .env
```

### 2. Deploy na Netlify
1. Pushněte kód na GitHub
2. Připojte GitHub repo v Netlify
3. Nastavte environment variables:
   - `AIRTABLE_API_KEY`
   - `AIRTABLE_BASE_ID`

### 3. Airtable nastavení
1. Vytvořte Personal Access Token
2. Přidejte pole typu "Attachment" pro PDF
3. Nainstalujte Scripting Extension

## 📝 Použití

### Airtable Script
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

## ⚡ Optimalizace

- PDF se generuje dynamicky při každém stažení
- HTML šablona je vložena přímo v kódu (rychlejší)
- Puppeteer používá optimalizovaný Chromium pro Lambda

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
