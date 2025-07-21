// netlify/functions/generate-pdf.js
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const handlebars = require('handlebars');
const Airtable = require('airtable');

// HTML šablona s podporou obrázků
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
            break-inside: avoid;
        }
        
        .day-header {
            background: #f8f8f8;
            padding: 8px 15px;
            font-weight: bold;
            color: #555;
        }
        
        .meal-section {
            padding: 15px;
            min-height: 120px;
        }
        
        .meal-type {
            font-size: 9pt;
            text-transform: uppercase;
            color: #888;
            margin-bottom: 5px;
        }
        
        .meal-content {
            display: flex;
            gap: 10px;
        }
        
        .meal-image {
            width: 80px;
            height: 80px;
            border-radius: 8px;
            object-fit: cover;
            flex-shrink: 0;
        }
        
        .meal-details {
            flex: 1;
        }
        
        .meal-title {
            font-weight: bold;
            margin-bottom: 8px;
            line-height: 1.3;
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
                    <div class="meal-content">
                        {{#if this.obedImage}}
                        <img src="{{this.obedImage}}" alt="{{this.obed}}" class="meal-image">
                        {{/if}}
                        <div class="meal-details">
                            <div class="meal-title">{{this.obed}}</div>
                            <ul class="meal-items">
                                {{#each this.obedPolozky}}
                                <li><span class="portion">{{this.pomer}}</span> {{this.nazev}}</li>
                                {{/each}}
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="divider"></div>
                
                <!-- Večeře -->
                <div class="meal-section">
                    <div class="meal-type">Večeře</div>
                    <div class="meal-content">
                        {{#if this.vecereImage}}
                        <img src="{{this.vecereImage}}" alt="{{this.vecere}}" class="meal-image">
                        {{/if}}
                        <div class="meal-details">
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
  
  menuData.forEach(item => {
    const den = item['Den'];
    if (!dayGroups[den]) {
      dayGroups[den] = {
        den: den,
        obedPolozky: [],
        vecerePolozky: [],
        obed: '',
        vecere: '',
        obedImage: null,
        vecereImage: null,
        vecereInstrukce: null
      };
    }
    
    const nazevJidla = item['Název jídla'] || '';
    const isObed = nazevJidla.toLowerCase().includes('oběd');
    
    // Zpracování obrázku z Airtable
    const imageField = item['fldKt9xsa6KrvmNPI']; // Pole s obrázkem
    let imageUrl = null;
    
    if (imageField && imageField.length > 0) {
      // Airtable vrací pole attachmentů
      imageUrl = imageField[0].url;
    } else if (item['@image']) {
      // Pokud existuje číselná reference na obrázek
      const imageNumber = item['@image'];
      if (imageNumber) {
        // Použít obrázek z GitHub repozitáře
        imageUrl = `https://raw.githubusercontent.com/komfi-health/meal-plans/main/img/meals/${imageNumber}.png`;
      }
    }
    
    if (isObed) {
      dayGroups[den].obed = nazevJidla.replace(/^OBĚD\s*/i, '').trim();
      if (imageUrl) {
        dayGroups[den].obedImage = imageUrl;
      }
    } else {
      dayGroups[den].vecere = nazevJidla.replace(/^VEČEŘE\s*/i, '').trim();
      if (imageUrl) {
        dayGroups[den].vecereImage = imageUrl;
      }
      if (item['Instrukce']) {
        dayGroups[den].vecereInstrukce = item['Instrukce'];
      }
    }
    
    if (item['Položka']) {
      const polozka = {
        nazev: item['Položka'],
        pomer: item['Poměr'] || '1'
      };
      
      if (isObed) {
        dayGroups[den].obedPolozky.push(polozka);
      } else {
        dayGroups[den].vecerePolozky.push(polozka);
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
    days: days.slice(0, 7) // Max 7 dní
  };
}
