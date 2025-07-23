const Airtable = require('airtable');

// Configuration
const apiKey = 'patBkFFXUTKxjfrH9.c4ae2004900da887054d1aa4f2dcc963b14556d5dce788fbe076df76073a6e83';
const baseId = 'appsLDyM9WHvamSmN';
const tableId = 'tblCHxatBEyaspzR3';

// Configure Airtable
const base = new Airtable({ apiKey: apiKey }).base(baseId);

async function fetchCircuitE27() {
    console.log('Fetching data for Circuit E_27 from table:', tableId);
    
    try {
        // First try to get any record to verify access
        console.log('\nTesting access with first 3 records...');
        const testRecords = await base(tableId)
            .select({
                maxRecords: 3
            })
            .firstPage();
            
        if (testRecords.length > 0) {
            console.log(`✓ Access confirmed! Found ${testRecords.length} test records`);
            console.log('Available fields:', Object.keys(testRecords[0].fields));
        }
        
        // Show some sample ID Circuit values
        console.log('\nSample ID Circuit values:');
        testRecords.forEach(record => {
            if (record.fields['ID Circuit']) {
                console.log(`- "${record.fields['ID Circuit']}"`);
            }
        });
        
        // Get more records to find Circuit patterns
        console.log('\nSearching for Circuit records...');
        const allRecords = await base(tableId)
            .select({
                maxRecords: 100,
                fields: ['ID Circuit', 'Klient', 'Den']
            })
            .all();
            
        const uniqueCircuits = [...new Set(allRecords.map(r => r.fields['ID Circuit']).filter(Boolean))];
        console.log(`\nFound ${uniqueCircuits.length} unique ID Circuit values:`);
        uniqueCircuits.slice(0, 20).forEach(circuit => {
            console.log(`- "${circuit}"`);
        });
        
        // Try different variations of Circuit E_27
        const variations = ['Circuit E_27', 'E_27', 'Circuit E-27', 'E-27', 'CIRCUIT E_27'];
        let foundRecords = [];
        
        for (const variation of variations) {
            console.log(`\nTrying variation: "${variation}"`);
            const records = await base(tableId)
                .select({
                    filterByFormula: `{ID Circuit} = '${variation}'`
                })
                .all();
                
            if (records.length > 0) {
                console.log(`✓ Found ${records.length} records!`);
                foundRecords = records;
                break;
            }
        }
            
        console.log(`Found ${records.length} records for Circuit E_27`);
        
        if (records.length > 0) {
            // Display the data
            records.forEach((record, index) => {
                console.log(`\n--- Record ${index + 1} ---`);
                const fields = record.fields;
                console.log('ID Circuit:', fields['ID Circuit']);
                console.log('Klient:', fields['Klient']);
                console.log('Den:', fields['Den']);
                console.log('Datum rozvozu:', fields['Datum rozvozu']);
                console.log('Typ jídla:', fields['Typ jídla']);
                console.log('Název jídla:', fields['Název jídla']);
                console.log('Položka:', fields['Položka']);
                console.log('Poměr:', fields['Poměr']);
                console.log('Template:', fields['Template']);
            });
        }
        
    } catch (error) {
        console.error('\nError details:');
        console.error('Error type:', error.error);
        console.error('Message:', error.message);
        console.error('Status code:', error.statusCode);
        
        if (error.statusCode === 422) {
            console.error('\nThis might be an invalid API key or base/table ID.');
        }
    }
}

fetchCircuitE27();