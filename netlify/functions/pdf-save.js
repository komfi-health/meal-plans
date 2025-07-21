const Airtable = require('airtable');
const FormData = require('form-data');

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

    // 2. Konverze base64 na buffer
    const pdfBuffer = Buffer.from(pdfData.pdf, 'base64');
    
    // 3. Upload na tmpfiles.org
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
    
    if (uploadResult.status === 'success') {
      // Převedeme URL na přímý odkaz
      const directUrl = uploadResult.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      
      // 4. Uložení do Airtable
      const base = new Airtable({ 
        apiKey: process.env.AIRTABLE_API_KEY 
      }).base(process.env.AIRTABLE_BASE_ID);
      
      await base('tblCHxatBEyaspzR3').update(airtableRecordId, {
        'fldzFLOoDZhhs00GN': [{
          url: directUrl,
          filename: pdfData.filename
        }]
      });
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'PDF uloženo',
          pdfUrl: directUrl,
          filename: pdfData.filename
        })
      };
    }
    
    throw new Error('Upload failed');

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
