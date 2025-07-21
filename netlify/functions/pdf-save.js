const Airtable = require('airtable');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { recordId, airtableRecordId } = JSON.parse(event.body);
    console.log('Processing:', recordId);

    // Vytvoříme URL pro stažení
    const downloadUrl = `https://kmfi-meals.netlify.app/.netlify/functions/download-pdf?id=${recordId}`;
    const filename = `jidelnicek_${recordId}_${Date.now()}.pdf`;
    
    // Uložení do Airtable
    const base = new Airtable({ 
      apiKey: process.env.AIRTABLE_API_KEY 
    }).base(process.env.AIRTABLE_BASE_ID);
    
    await base('tblCHxatBEyaspzR3').update(airtableRecordId, {
      'fldzFLOoDZhhs00GN': [{
        url: downloadUrl,
        filename: filename
      }]
    });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'PDF URL uloženo',
        pdfUrl: downloadUrl,
        filename: filename
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
