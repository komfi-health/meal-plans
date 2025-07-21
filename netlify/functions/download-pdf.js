exports.handler = async (event, context) => {
  const { id } = event.queryStringParameters || {};
  
  if (!id) {
    return {
      statusCode: 400,
      body: 'Missing ID parameter'
    };
  }

  try {
    // Vygenerujeme PDF
    const pdfResponse = await fetch('https://kmfi-meals.netlify.app/.netlify/functions/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        recordId: id,
        tableName: 'tblCHxatBEyaspzR3'
      })
    });
    
    const pdfData = await pdfResponse.json();
    
    if (!pdfData.success) {
      throw new Error('PDF generation failed');
    }

    // Vrátíme PDF přímo
    const pdfBuffer = Buffer.from(pdfData.pdf, 'base64');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfData.filename}"`,
        'Cache-Control': 'public, max-age=3600'
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      body: error.message
    };
  }
};
