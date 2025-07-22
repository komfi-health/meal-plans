// Airtable Script - Generovat a automaticky uložit PDF
console.log('🚀 PDF Generator s automatickým uložením');

// AKTUALIZOVANÁ URL - řádek 4
const NETLIFY_FUNCTION_URL = 'https://kmfi-meals.netlify.app/.netlify/functions/pdf-save';
const table = base.getTable('CSV jídelníčky');

// Načtení všech záznamů
const query = await table.selectRecordsAsync();
const records = query.records;

// Zobrazíme první záznamy pro výběr
console.log('Vyberte záznam (změňte ID_CIRCUIT níže):');
records.slice(0, 5).forEach(rec => {
    const id = rec.getCellValue('ID Circuit');
    const klient = rec.getCellValue('Klient');
    console.log(`- ${id}: ${klient}`);
});

// ZMĚŇTE TOTO na ID, které chcete zpracovat
const ID_CIRCUIT = 'EXTRA_144';  // <-- UPRAVTE NA VAŠE ID

// Najdeme záznam
const record = records.find(r => r.getCellValue('ID Circuit') === ID_CIRCUIT);

if (!record) {
    console.log(`Záznam s ID ${ID_CIRCUIT} nenalezen.`);
} else {
    const recordId = record.getCellValue('ID Circuit');
    const klient = record.getCellValue('Klient');
    
    console.log(`📄 Generuji a ukládám PDF pro: ${klient} (${recordId})`);
    console.log('⏳ Čekejte prosím...');
    
    try {
        const response = await fetch(NETLIFY_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recordId: recordId,
                airtableRecordId: record.id
            })
        });
        
        const result = await response.json();
        console.log('Odpověď serveru:', result);
        
        if (result.success) {
            console.log('✅ PDF úspěšně vygenerováno a uloženo!');
            console.log('📎 PDF bylo automaticky přidáno do záznamu');
            console.log(`🔗 URL: ${result.pdfUrl}`);
            console.log(`📄 Soubor: ${result.filename}`);
            console.log('\n✨ Zkontrolujte pole "PDF Jídelníček" v záznamu!');
            
        } else {
            console.error('❌ Chyba:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Chyba při volání API:', error.message);
    }
} 