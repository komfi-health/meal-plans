// netlify/functions/generate-pdf.js
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const handlebars = require('handlebars');
const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');

// HTML šablona přímo v kódu pro rychlost
const htmlTemplate = fs.readFileSync(path.join(__dirname, 'jidelnicek.html'), 'utf8');

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
    console.log('templateData:', JSON.stringify(templateData, null, 2));
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
  const templateType = menuData[0]?.['Template'] || '5x-O';
  const match = templateType.match(/(\d+)x([A-Z0-9\-]+)/);
  const daysCount = match ? parseInt(match[1], 10) : 5;
  const mealTypeString = match ? match[2] : 'O';
  // Nové robustní rozpoznání typů jídel podle šablony
  const mealTypeOrder = ['S', 'SV1', 'O', 'SV2', 'V'];
  const mealTypeKeys = mealTypeString.split('-');
  const mealTypes = mealTypeOrder.filter(t => mealTypeKeys.includes(t)).map(t => ({
    key: t,
    label: t === 'S' ? 'Snídaně' : t === 'SV1' ? 'Dop. svačina' : t === 'O' ? 'Oběd' : t === 'SV2' ? 'Odp. svačina' : 'Večeře'
  }));
  const simpleLayout = mealTypes.length === 1;
  // Seskupit záznamy podle dne a typu jídla
  menuData.forEach(item => {
    const den = item['Den'];
    if (!dayGroups[den]) {
      dayGroups[den] = { den: den, meals: {} };
    }
    // Nejprve zkusit pole 'Typ jídla', pak 'Typ Barva', pak podle názvu
    let typ = item['Typ jídla'] || null;
    // Mapování českých názvů na interní klíče
    const typBarvaMap = {
      'Snídaně': 'S',
      'Dop. svačina': 'SV1',
      'Oběd': 'O',
      'Odp. svačina': 'SV2',
      'Večeře': 'V',
      '🟡 Snídaně': 'S',
      '🟠 Odp. svačina': 'SV2',
      '🟣 Oběd': 'O',
      '🟢 Dop. svačina': 'SV1',
      '🔵 Večeře': 'V',
      '⚪ Večeře': 'V',
    };
    if (!typ && item['Typ Barva']) {
      // Najdi klíč podle začátku nebo celého názvu
      for (const [cz, key] of Object.entries(typBarvaMap)) {
        if (item['Typ Barva'] === cz || item['Typ Barva'].endsWith(cz.replace(/^[^ ]+ /, ''))) {
          typ = key;
          break;
        }
      }
    }
    if (!typ) {
      const nazev = (item['Název jídla'] || '').toLowerCase();
      if (nazev.includes('snídaně') || nazev.includes('snidane')) typ = 'S';
      else if (nazev.includes('dopolední svačina') || nazev.includes('dop. svačina') || nazev.includes('sv1')) typ = 'SV1';
      else if (nazev.includes('oběd') || nazev.includes('obed')) typ = 'O';
      else if (nazev.includes('odpolední svačina') || nazev.includes('odp. svačina') || nazev.includes('sv2')) typ = 'SV2';
      else if (nazev.includes('večeře') || nazev.includes('vecere')) typ = 'V';
    }
    // Fallback: pokud je v šabloně jen jeden typ jídla, přiřadit vše do něj
    if (!typ && simpleLayout) typ = mealTypes[0].key;
    if (!typ) return;
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
    // Připravit položku
    const polozka = {
      nazev: item['Položka'] || '',
      pomer: item['Poměr'] || '1',
      instructions: item['Instrukce'] || '',
      image: imageUrl
    };
    // Pokud už existuje, přidat do pole
    if (!dayGroups[den].meals[typ]) {
      dayGroups[den].meals[typ] = { items: [], image: imageUrl, instructions: item['Instrukce'] || '', title: '' };
    }
    dayGroups[den].meals[typ].items.push(polozka);
    // Pokud ještě není nastaven obrázek/instrukce, nastav z prvního záznamu
    if (!dayGroups[den].meals[typ].image && imageUrl) {
      dayGroups[den].meals[typ].image = imageUrl;
    }
    if (!dayGroups[den].meals[typ].instructions && item['Instrukce']) {
      dayGroups[den].meals[typ].instructions = item['Instrukce'];
    }
    // Pokud je vyplněn Název jídla a ještě není title, nastav ho
    if (item['Název jídla'] && !dayGroups[den].meals[typ].title) {
      dayGroups[den].meals[typ].title = item['Název jídla'];
    }
  });
  // Sestavit pole dnů podle pořadí
  const days = Object.values(dayGroups)
    .sort((a, b) => a.den - b.den)
    .slice(0, daysCount)
    .map(day => {
      // Zajistit, že pro každý den jsou všechny typy jídel z konfigurace
      mealTypes.forEach(mt => {
        if (!day.meals[mt.key]) {
          day.meals[mt.key] = { items: [], image: null, instructions: '', title: '' };
        }
      });
      return day;
    });
  // Pro jednoduché šablony připravit pole meals jako pole (kvůli šabloně)
  if (simpleLayout) {
    days.forEach(day => {
      const typ = mealTypes[0].key;
      day.meals = [day.meals[typ] || { items: [], image: null, instructions: '', title: '' }];
    });
  }
  const firstRecord = menuData[0] || {};
  // Dynamicky určit počet dní na řádek (max 4 pro tabulky, 2 pro velké karty)
  const daysPerRow = simpleLayout ? 2 : (daysCount > 4 ? 4 : daysCount);
  return {
    klient: firstRecord['Klient'] || 'Klient',
    idCircuit: firstRecord['ID Circuit'] || '',
    datumDonaska: firstRecord['Datum rozvozu'] || '',
    kontaktOsoba: 'Jiří Žilka',
    telefon: '734 602 600',
    email: 'zakaznici@budtekomfi.cz',
    days,
    mealTypes,
    simpleLayout,
    daysPerRow,
    templateType
  };
}

// Před kompilací šablony:
handlebars.registerHelper('isEven', function(index) {
  return index % 2 === 0;
});
