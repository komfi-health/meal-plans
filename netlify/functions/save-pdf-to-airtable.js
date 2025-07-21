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
    
    // 2. Upload na Cloudinary demo (pro test)
    const cloudinaryUrl = 'https://api.cloudinary.com/v1_1/demo/upload';
    
    const uploadResponse = await fetch(cloudinaryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        file: `data:application/pdf;base64,${pdfData.pdf}`,
        upload_preset: 'ml_default',
        public_id: pdfData.filename.replace('.pdf', ''),
        resource_type: 'raw'
      })
    });
    
    const uploadResult = await uploadResponse.json();
    console.log('Upload result:', uploadResult);
    
    // 3. Uložení URL do Airtable
    if (uploadResult.secure_url) {
      await base('tblCHxatBEyaspzR3').update(airtableRecordId, {
        'fldzFLOoDZhhs00GN': [{
          url: uploadResult.secure_url,
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
          pdfUrl: uploadResult.secure_url,
          size: pdfData.pdf.length
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
