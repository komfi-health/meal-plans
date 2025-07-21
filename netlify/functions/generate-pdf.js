// netlify/functions/generate-pdf.js
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const handlebars = require('handlebars');
const Airtable = require('airtable');

// HTML šablona přímo v kódu pro rychlost
const htmlTemplate = `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jídelníček - {{klient}}</title>
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #333;
        }
        
        .page {
            width: 210mm;
            height: 297mm;
            padding: 15mm;
            position: relative;
            background: white;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .client-name {
            font-size: 24pt;
            font-weight: 300;
        }
        
        .meta-info {
            text-align: right;
            font-size: 10pt;
            color: #666;
        }
        
        .days-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .day-card {
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
        }
        
        .day-header {
            background: #f8f8f8;
            padding: 8px 15px;
            font-weight: bold;
            color: #555;
        }
        
        .meal-section {
            padding: 15px;
        }
        
        .meal-type {
            font-size: 9pt;
            text-transform: uppercase;
            color: #888;
            margin-bottom: 5px;
        }
        
        .meal-title {
            font-weight: bold;
            margin-bottom: 8px;
            line-height: 1.3;
        }
        
        .meal-image {
            width: 80px;
            height: 80px;
            border-radius: 8px;
            object-fit: cover;
            float: left;
            margin-right: 15px;
            margin-bottom: 10px;
        }
        
        .meal-items {
            list-style: none;
            font-size: 9pt;
            line-height: 1.5;
        }
        
        .meal-items li {
            padding-left: 15px;
            position: relative;
            color: #666;
        }
        
        .meal-items li:before {
            content: "•";
            position: absolute;
            left: 0;
            color: #d4a574;
        }
        
        .portion {
            font-weight: bold;
            color: #333;
            margin-right: 5px;
        }
        
        .instructions {
            clear: both;
            margin-top: 10px;
            padding: 10px;
            background: #fafafa;
            border-radius: 5px;
            font-size: 9pt;
            color: #666;
            line-height: 1.4;
        }
        
        .divider {
            height: 1px;
            background: #f0f0f0;
            margin: 15px 0;
        }
        
        .footer {
            position: absolute;
            bottom: 15mm;
            left: 15mm;
            right: 15mm;
            border-top: 2px solid #f0f0f0;
            padding-top: 15px;
        }
        
        .contact-info {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 15px;
        }
        
        .contact-person {
            font-weight: bold;
            font-size: 12pt;
        }
        
        .contact-details {
            font-size: 10pt;
            color: #666;
            line-height: 1.5;
        }
        
        .logo {
            height: 40px;
        }
        
        .info-boxes {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            font-size: 9pt;
        }
        
        .info-box {
            padding: 10px;
            background: #f8f8f8;
            border-radius: 5px;
        }
        
        .info-box h4 {
            margin-bottom: 5px;
            color: #d4a574;
            font-size: 10pt;
        }
        
        @media print {
            .page {
                margin: 0;
                page-break-after: always;
            }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <div class="client-name">{{klient}}</div>
            <div class="meta-info">
                <div>ID {{idCircuit}}</div>
                <div>Datum donášky {{datumDonaska}}</div>
            </div>
        </div>
        
        <div class="days-grid">
            {{#each days}}
            <div class="day-card">
                <div class="day-header">DEN {{this.den}}</div>
                
                <!-- Oběd -->
                <div class="meal-section">
                    <div class="meal-type">Oběd</div>
                    {{#if this.obedImage}}
                    <img src="{{this.obedImage}}" alt="{{this.obed}}" class="meal-image">
                    {{/if}}
                    <div class="meal-title">{{this.obed}}</div>
                    <ul class="meal-items">
                        {{#each this.obedPolozky}}
                        <li><span class="portion">{{this.pomer}}</span> {{this.nazev}}</li>
                        {{/each}}
                    </ul>
                </div>
                
                <div class="divider"></div>
                
                <!-- Večeře -->
                <div class="meal-section">
                    <div class="meal-type">Večeře</div>
                    <div class="meal-title">{{this.vecere}}</div>
                    {{#if this.vecereInstrukce}}
                    <div class="instructions">{{this.vecereInstrukce}}</div>
                    {{/if}}
                    <ul class="meal-items">
                        {{#each this.vecerePolozky}}
                        <li><span class="portion">{{this.pomer}}</span> {{this.nazev}}</li>
                        {{/each}}
                    </ul>
                </div>
            </div>
            {{/each}}
        </div>
        
        <div class="footer">
            <div class="contact-info">
                <div>
                    <div class="contact-person">{{kontaktOsoba}}</div>
                    <div class="contact-details">
                        {{telefon}}<br>
                        {{email}}
                    </div>
                </div>
                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTIwIDQwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogICAgPHRleHQgeD0iNjAiIHk9IjI1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiNkNGE1NzQiPmtvbWZpPC90ZXh0Pgo8L3N2Zz4=" alt="komfi" class="logo">
            </div>
            
            <div class="info-boxes">
                <div class="info-box">
                    <h4>ZMĚNY</h4>
                    <p>Rádi byste změnili objednávku nebo vyřadili konkrétní jídlo? Ozvěte se nám do pondělí 9:00, abyste stihli změnu ještě v daném týdnu.</p>
                </div>
                <div class="info-box">
                    <h4>PRVNÍ OBJEDNÁVKA NA DOBÍRKU</h4>
                    <p>Dostali jste první objednávku na dobírku a chutnalo Vám? Ozvěte se nám do pondělí 9:00 pomocí chatu na webu, emailem nebo případně telefonicky. Objednávka se automaticky neobnovuje.</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

// Inicializace Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

exports.handler = async (event, context) => {
  // Pouze POST metoda
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parsování parametrů
    const { recordId, tableName = 'Jídelníčky' } = JSON.parse(event.body || '{}');
    
    if (!recordId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'recordId je povinný' })
      };
    }

    console.log('Generuji PDF pro:', recordId);

    // 1. Načtení dat z Airtable
    const menuData = await fetchMenuData(recordId, tableName);
    
    if (!menuData || menuData.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Data nenalezena' })
      };
    }

    // 2. Transformace dat pro šablonu
    const templateData = transformDataForTemplate(menuData);
    
    // 3. Kompilace HTML
    const template = handlebars.compile(htmlTemplate);
    const html = template(templateData);
    
    // 4. Generování PDF pomocí Puppeteer
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    
    await browser.close();
    
    // 5. Vrácení PDF jako base64
    const pdfBase64 = pdf.toString('base64');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        pdf: pdfBase64,
        filename: `jidelnicek_${recordId}_${Date.now()}.pdf`,
        message: 'PDF úspěšně vygenerováno'
      })
    };
    
  } catch (error) {
    console.error('Chyba při generování PDF:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

async function fetchMenuData(recordId, tableName) {
  try {
    const records = await base(tableName).select({
      filterByFormula: `{ID Circuit} = '${recordId}'`,
      sort: [
        { field: 'Den', direction: 'asc' }
      ]
    }).all();
    
    return records.map(record => record.fields);
  } catch (error) {
    console.error('Chyba při načítání dat z Airtable:', error);
    throw error;
  }
}

function transformDataForTemplate(menuData) {
  const dayGroups = {};
  
  // Získat typ šablony z prvního záznamu
  const templateType = menuData[0]?.['Template'] || '5x0';
  console.log('Typ šablony:', templateType);
  
  // Rozpoznat, která jídla zobrazit podle typu šablony
  const showMeals = {
    S: templateType.includes('S'),
    SV1: templateType.includes('SV1'),
    O: templateType.includes('O'),
    SV2: templateType.includes('SV2'),
    V: templateType.includes('V')
  };
  
  menuData.forEach(item => {
    const den = item['Den'];
    if (!dayGroups[den]) {
      dayGroups[den] = {
        den: den,
        // Inicializace podle typu šablony
        snidanePolozky: [],
        svacina1Polozky: [],
        obedPolozky: [],
        svacina2Polozky: [],
        vecerePolozky: [],
        snidane: '',
        svacina1: '',
        obed: '',
        svacina2: '',
        vecere: '',
        snidaneImage: null,
        svacina1Image: null,
        obedImage: null,
        svacina2Image: null,
        vecereImage: null,
        snidaneInstrukce: null,
        svacina1Instrukce: null,
        obedInstrukce: null,
        svacina2Instrukce: null,
        vecereInstrukce: null
      };
    }
    
    const nazevJidla = item['Název jídla'] || '';
    const nazevLower = nazevJidla.toLowerCase();
    
    // Rozpoznání typu jídla
    let mealType = null;
    if (nazevLower.includes('snídaně') || nazevLower.includes('snidane')) {
      mealType = 'snidane';
    } else if (nazevLower.includes('svačina 1') || nazevLower.includes('dopolední svačina')) {
      mealType = 'svacina1';
    } else if (nazevLower.includes('oběd') || nazevLower.includes('obed')) {
      mealType = 'obed';
    } else if (nazevLower.includes('svačina 2') || nazevLower.includes('odpolední svačina')) {
      mealType = 'svacina2';
    } else if (nazevLower.includes('večeře') || nazevLower.includes('vecere')) {
      mealType = 'vecere';
    }
    
    // Zpracování obrázku
    const imagePath = item['@image'];
    let imageUrl = null;
    
    if (imagePath) {
      if (!imagePath.includes('/')) {
        imageUrl = `https://raw.githubusercontent.com/komfi-health/meal-plans/main/img/meals/${imagePath}`;
      } else {
        imageUrl = `https://raw.githubusercontent.com/komfi-health/meal-plans/main/${imagePath}`;
      }
    }
    
    // Přiřazení dat podle typu jídla
    if (mealType) {
      // Název jídla bez prefixu
      const cleanName = nazevJidla
        .replace(/^(SNÍDANĚ|SVAČINA 1|OBĚD|SVAČINA 2|VEČEŘE)\s*/i, '')
        .trim();
      
      dayGroups[den][mealType] = cleanName;
      
      if (imageUrl) {
        dayGroups[den][mealType + 'Image'] = imageUrl;
      }
      
      if (item['Instrukce']) {
        dayGroups[den][mealType + 'Instrukce'] = item['Instrukce'];
      }
      
      if (item['Položka']) {
        const polozka = {
          nazev: item['Položka'],
          pomer: item['Poměr'] || '1'
        };
        dayGroups[den][mealType + 'Polozky'].push(polozka);
      }
    }
  });
  
  const days = Object.values(dayGroups).sort((a, b) => a.den - b.den);
  const firstRecord = menuData[0] || {};
  
  return {
    klient: firstRecord['Klient'] || 'Klient',
    idCircuit: firstRecord['ID Circuit'] || '',
    datumDonaska: firstRecord['Datum rozvozu'] || '',
    kontaktOsoba: 'Jiří Žilka',
    telefon: '734 602 600',
    email: 'zakaznici@budtekomfi.cz',
    days: days.slice(0, 7),
    templateType: templateType,
    showMeals: showMeals
  };
}
