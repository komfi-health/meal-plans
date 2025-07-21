// netlify/functions/generate-save-simple.js
const Airtable = require('airtable');
const fetch = require('node-fetch');
const FormData = require('form-data');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { recordId, airtableRecordId } = JSON.parse(event.body || '{}');
    
    console.log('Generuji PDF pro:', recordId);
    console.log('Airtable record ID:', airtableRecordId);

    // 1. Nejdřív vygenerujeme PDF voláním naší existující funkce
    const pdfResponse = await fetch(`${process.env.URL}/.netlify/functions/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        recordId, 
        tableName: 'tblCHxatBEyaspzR3' 
      })
    });

    const pdfResult = await pdfResponse.json();
    
    if (!pdfResult.success) {
      throw new Error(pdfResult.error);
    }

    console.log('PDF vygenerováno, velikost:', pdfResult.pdf.length);

    // 2. Konverze base64 na Buffer
    const pdfBuffer = Buffer.from(pdfResult.pdf, 'base64');
    
    // 3. Upload na file.io (soubor vydrží 14 dní)
    const formData = new FormData();
    formData.append('file', pdfBuffer, {
      filename: pdfResult.filename,
      contentType
ls -la netlify/functions/
ls -la netlify/functions/
cat > netlify/functions/generate-save-simple.js << 'EOF'
// netlify/functions/generate-save-simple.js
const Airtable = require('airtable');
const fetch = require('node-fetch');
const FormData = require('form-data');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { recordId, airtableRecordId } = JSON.parse(event.body || '{}');
    
    console.log('Generuji PDF pro:', recordId);
    console.log('Airtable record ID:', airtableRecordId);

    // 1. Nejdřív vygenerujeme PDF voláním naší existující funkce
    const pdfResponse = await fetch(`${process.env.URL}/.netlify/functions/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        recordId, 
        tableName: 'tblCHxatBEyaspzR3' 
      })
    });

    const pdfResult = await pdfResponse.json();
    
    if (!pdfResult.success) {
      throw new Error(pdfResult.error);
    }

    console.log('PDF vygenerováno, velikost:', pdfResult.pdf.length);

    // 2. Konverze base64 na Buffer
    const pdfBuffer = Buffer.from(pdfResult.pdf, 'base64');
    
    // 3. Upload na file.io (soubor vydrží 14 dní)
    const formData = new FormData();
    formData.append('file', pdfBuffer, {
      filename: pdfResult.filename,
      contentType: 'application/pdf'
    });
    
    const uploadResponse = await fetch('https://file.io', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const uploadResult = await uploadResponse.json();
    
    console.log('Upload výsledek:', uploadResult);
    
    if (!uploadResult.success) {
      throw new Error('Upload selhal');
    }
    
    // 4. Uložení URL do Airtable
    console.log('Ukládám do Airtable...');
    
    await base('tblCHxatBEyaspzR3').update(airtableRecordId, {
      'fldzFLOoDZhhs00GN': [{
        url: uploadResult.link,
        filename: pdfResult.filename
      }]
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'PDF uloženo do Airtable',
        pdfUrl: uploadResult.link,
        filename: pdfResult.filename
      })
    };
    
  } catch (error) {
    console.error('Chyba:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
