const Airtable = require('airtable');

// Configuration
const apiKey = 'patBkFFXUTKxjfrH9.c4ae2004900da887054d1aa4f2dcc963b14556d5dce788fbe076df76073a6e83';
const baseId = 'appsLDyM9WHvamSmN';
const tableId = 'tblCHxatBEyaspzR3';

// Configure Airtable
const base = new Airtable({ apiKey: apiKey }).base(baseId);

async function find5xOTemplates() {
    const templates5xO = new Map();
    
    await base(tableId)
        .select({
            fields: ['ID Circuit', 'Template', 'Klient']
        })
        .eachPage((records, fetchNextPage) => {
            records.forEach(record => {
                const template = record.fields['Template'];
                const idCircuit = record.fields['ID Circuit'];
                const klient = record.fields['Klient'];
                
                if (template === '5x-O' && idCircuit) {
                    templates5xO.set(idCircuit, klient || '');
                }
            });
            fetchNextPage();
        });
    
    console.log(`Found ${templates5xO.size} records with 5x-O template:\n`);
    
    const sorted = Array.from(templates5xO.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    sorted.forEach(([id, klient]) => {
        console.log(`${id} - ${klient}`);
    });
    
    return sorted.map(([id]) => id);
}

find5xOTemplates()
    .then(ids => {
        console.log(`\nTotal: ${ids.length} IDs with 5x-O template`);
        // Output as JavaScript array for easy copy-paste
        console.log('\nAs array:');
        console.log(JSON.stringify(ids));
        process.exit(0);
    })
    .catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });