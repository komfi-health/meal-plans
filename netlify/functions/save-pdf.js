// netlify/functions/save-pdf.js
const Airtable = require('airtable');
const fetch = require('node-fetch');

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
    
    console.log('Generating and saving PDF for:', recordId);

    // 1. Nejdřív vygenerujeme PDF
    const pdfResponse = await fetch(`${process.env.URL}/.netlify/functions/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId, tableName })
    });

    const pdfResult = await pdfResponse.json();
    
    if (!pdfResult.success) {
      throw new Error(pdfResult.error);
    }

    // 2. Upload PDF do dočasného úložiště (Cloudinary nebo jiné)
    // Pro jednoduchost použijeme file.io (dočasné řešení)
    const formData = new FormData();
    const buffer = Buffer.from(pdfResult.pdf, 'base64');
    formData.append('file', buffer, pdfResult.filename);
    
    const uploadResponse = await fetch('https://file.io', {
      method: 'POST',
      body: formData
    });
    
    const uploadResult = await uploadResponse.json();
    
    // 3. Uložení URL do Airtable
    await base(tableName).update(airtableRecordId, {
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
        message: 'PDF uloženo',
        filename: pdfResult.filename
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
