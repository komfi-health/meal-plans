// netlify/functions/generate-save-simple.js
const Airtable = require('airtable');

exports.handler = async (event, context) => {
  // Kontrola metody
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parsování parametrů
    const { recordId, airtableRecordId } = JSON.parse(event.body || '{}');
    
    if (!recordId || !airtableRecordId) {
      throw new Error('Chybí recordId nebo airtableRecordId');
    }
    
    console.log('Zpracovávám:', { recordId, airtableRecordId });

    // Inicializace Airtable
    const base = new Airtable({ 
      apiKey: process.env.AIRTABLE_API_KEY 
    }).base(process.env.AIRTABLE_BASE_ID);

    // 1. Volání generate-pdf funkce
    const pdfUrl = `https://kmfi-meals.netlify.app/.netlify/functions/generate-pdf`;
    
    const pdfResponse = await fetch(pdfUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        recordId: recordId, 
        tableName: 'tblCHxatBEyaspzR3' 
      })
    });

    const pdfResult = await pdfResponse.json();
    
    if (!pdfResult.success) {
      throw new Error(pdfResult.error || 'PDF generování selhalo');
    }

    console.log('PDF vygenerováno, velikost:', pdfResult.pdf.length);

    // 2. Vytvoření data URL
    const dataUrl = `data:application/pdf;base64,${pdfResult.pdf}`;
    
    // 3. Uložení do Airtable
    // Poznámka: Airtable attachment pole vyžaduje URL, ne data URL
    // Pro test zkusíme použít dočasné řešení
cat > netlify/functions/generate-save-simple.js << 'EOF'
// netlify/functions/generate-save-simple.js
const Airtable = require('airtable');

exports.handler = async (event, context) => {
  // Kontrola metody
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parsování parametrů
    const { recordId, airtableRecordId } = JSON.parse(event.body || '{}');
    
    if (!recordId || !airtableRecordId) {
      throw new Error('Chybí recordId nebo airtableRecordId');
    }
    
    console.log('Zpracovávám:', { recordId, airtableRecordId });

    // Inicializace Airtable
    const base = new Airtable({ 
      apiKey: process.env.AIRTABLE_API_KEY 
    }).base(process.env.AIRTABLE_BASE_ID);

    // 1. Volání generate-pdf funkce
    const pdfUrl = `https://kmfi-meals.netlify.app/.netlify/functions/generate-pdf`;
    
    const pdfResponse = await fetch(pdfUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        recordId: recordId, 
        tableName: 'tblCHxatBEyaspzR3' 
      })
    });

    const pdfResult = await pdfResponse.json();
    
    if (!pdfResult.success) {
      throw new Error(pdfResult.error || 'PDF generování selhalo');
    }

    console.log('PDF vygenerováno, velikost:', pdfResult.pdf.length);

    // 2. Vytvoření data URL
    const dataUrl = `data:application/pdf;base64,${pdfResult.pdf}`;
    
    // 3. Uložení do Airtable
    // Poznámka: Airtable attachment pole vyžaduje URL, ne data URL
    // Pro test zkusíme použít dočasné řešení
    
    const updateResult = await base('tblCHxatBEyaspzR3').update(airtableRecordId, {
      'fldzFLOoDZhhs00GN': [{
        url: dataUrl.substring(0, 100) + '...', // Zkrácená verze pro test
        filename: pdfResult.filename
      }]
    });

    console.log('Airtable update dokončen');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'PDF vygenerováno',
        filename: pdfResult.filename,
        note: 'PDF je v base64 formátu, pro plnou funkcionalitu potřebujeme upload service'
      })
    };
    
  } catch (error) {
    console.error('Chyba:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Neznámá chyba'
      })
    };
  }
};
