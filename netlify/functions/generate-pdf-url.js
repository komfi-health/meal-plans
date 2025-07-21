// netlify/functions/generate-pdf-url.js
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const handlebars = require('handlebars');
const Airtable = require('airtable');

// Vložte sem celou HTML šablonu z generate-pdf.js
const htmlTemplate = \`<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <title>Jídelníček - {{klient}}</title>
    <style>
        /* Zkopírujte styly z generate-pdf.js */
    </style>
</head>
<body>
    <!-- Zkopírujte HTML z generate-pdf.js -->
</body>
</html>\`;

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { recordId, airtableRecordId, tableName = 'tblCHxatBEyaspzR3' } = JSON.parse(event.body || '{}');
    
    // 1. Načtení dat z Airtable
    const records = await base(tableName).select({
      filterByFormula: \`{ID Circuit} = '\${recordId}'\`,
      sort: [{ field: 'Den', direction: 'asc' }]
    }).all();
    
    const menuData = records.map(record => record.fields);
    
    // 2. Transformace dat
    const templateData = transformDataForTemplate(menuData);
    
    // 3. Generování PDF
    const template = handlebars.compile(htmlTemplate);
    const html = template(templateData);
    
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
    
    // 4. Upload na Uploadcare (zdarma pro testování)
    const uploadcareResponse = await fetch('https://upload.uploadcare.com/base/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: pdf
    });
    
    const uploadResult = await uploadcareResponse.json();
    const pdfUrl = \`https://ucarecdn.com/\${uploadResult.file}/\`;
    
    // 5. Uložení do Airtable
    if (airtableRecordId) {
      await base(tableName).update(airtableRecordId, {
        'fldzFLOoDZhhs00GN': [{
          url: pdfUrl,
          filename: \`jidelnicek_\${recordId}_\${Date.now()}.pdf\`
        }]
      });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        pdfUrl: pdfUrl,
        message: 'PDF vygenerováno a uloženo'
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

// Zkopírujte funkci transformDataForTemplate z generate-pdf.js
function transformDataForTemplate(menuData) {
  // ... stejný kód jako v generate-pdf.js
}
