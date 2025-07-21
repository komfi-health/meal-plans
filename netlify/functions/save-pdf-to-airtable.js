const Airtable = require('airtable');

exports.handler = async (event, context) => {
  console.log('Save PDF to Airtable - start');
  
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
    const body = JSON.parse(event.body || '{}');
    const { recordId, airtableRecordId } = body;
    
    console.log('Processing:', recordId, airtableRecordId);
    
    // Inicializace Airtable
    const base = new Airtable({ 
      apiKey: process.env.AIRTABLE_API_KEY 
    }).base(process.env.AIRTABLE_BASE_ID);
    
    // Zavoláme generate-pdf endpoint
    const pdfResponse = await fetch('https://kmfi-meals.netlify.app/.netlify/functions/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        recordId: recordId,
        tableName: 'tblCHxatBEyaspzR3'
      })
    });
    
    const pdfData = await pdfResponse.json();
    
    if (!pdfData.success) {
      throw new Error('PDF generation failed');
    }
    
    // Pro test - vrátíme jen info
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'PDF generated successfully',
        filename: pdfData.filename,
        size: pdfData.pdf.length
      })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.toString()
      })
    };
  }
};
