// netlify/functions/generate-pdf.js
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const handlebars = require('handlebars');
const Airtable = require('airtable');
const fs = require('fs').promises;
const path = require('path');

// Inicializace Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// Načtení HTML šablony
async function loadTemplate() {
  const templatePath = path.join(__dirname, '../../templates/jidelnicek.html');
  return await fs.readFile(templatePath, 'utf-8');
}

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
    const htmlTemplate = await loadTemplate();
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
        vecereInstrukce: null
      };
    }
    
    const nazevJidla = item['Název jídla'] || '';
    const isObed = nazevJidla.toLowerCase().includes('oběd');
    
    if (isObed) {
      dayGroups[den].obed = nazevJidla.replace(/^OBĚD\s*/i, '').trim();
      if (item['@image']) {
        dayGroups[den].obedImage = item['@image'];
      }
    } else {
      dayGroups[den].vecere = nazevJidla.replace(/^VEČEŘE\s*/i, '').trim();
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
