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
    
    // Inicializace A
cat > netlify/functions/save-pdf-to-airtable.js << 'EOF'
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
    
    // 1. Vygenerujeme PDF
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
    
    console.log('PDF generated, size:', pdfData.pdf.length);
    
    // 2. Konverze base64 na buffer
    const pdfBuffer = Buffer.from(pdfData.pdf, 'base64');
    
    // 3. Upload na tmpfiles.org (soubory vydrží 1 hodinu)
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', pdfBuffer, {
      filename: pdfData.filename,
      contentType: 'application/pdf'
    });
    
    const uploadResponse = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const uploadResult = await uploadResponse.json();
    console.log('Upload result:', uploadResult);
    
    if (uploadResult.status === 'success' && uploadResult.data && uploadResult.data.url) {
      // Převedeme URL na přímý odkaz
      const directUrl = uploadResult.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      
      // 4. Uložení URL do Airtable
      await base('tblCHxatBEyaspzR3').update(airtableRecordId, {
        'fldzFLOoDZhhs00GN': [{
          url: directUrl,
          filename: pdfData.filename
        }]
      });
      
      console.log('Saved to Airtable');
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'PDF uloženo do Airtable',
          filename: pdfData.filename,
          pdfUrl: directUrl,
          note: 'Soubor je dočasný - vydrží 1 hodinu'
        })
      };
    } else {
      throw new Error('Upload failed: ' + JSON.stringify(uploadResult));
    }
    
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
