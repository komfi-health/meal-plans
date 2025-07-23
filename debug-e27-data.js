const Airtable = require('airtable');

// Configuration
const apiKey = 'patBkFFXUTKxjfrH9.c4ae2004900da887054d1aa4f2dcc963b14556d5dce788fbe076df76073a6e83';
const baseId = 'appsLDyM9WHvamSmN';
const tableId = 'tblCHxatBEyaspzR3';

// Configure Airtable
const base = new Airtable({ apiKey: apiKey }).base(baseId);

async function debugE27() {
    console.log('Debugging E_27 data structure...\n');
    
    try {
        const records = await base(tableId)
            .select({
                filterByFormula: `{ID Circuit} = 'E_27'`,
                sort: [{ field: 'Den', direction: 'asc' }]
            })
            .all();
            
        console.log(`Found ${records.length} records\n`);
        
        // Show each record in detail
        records.forEach((record, idx) => {
            console.log(`\n===== RECORD ${idx + 1} =====`);
            const fields = record.fields;
            console.log(`Den: ${fields['Den']}`);
            console.log(`Typ jídla: "${fields['Typ jídla']}"`);
            console.log(`Typ Barva: "${fields['Typ Barva']}"`);
            console.log(`Název jídla: "${fields['Název jídla']}"`);
            console.log(`Položka: "${fields['Položka']}"`);
            console.log(`Poměr: "${fields['Poměr']}"`);
            console.log(`@image: "${fields['@image']}"`);
        });
        
        // Group by day and type to see structure
        console.log('\n\n===== GROUPED BY DAY =====');
        const byDay = {};
        records.forEach(record => {
            const day = record.fields['Den'];
            const typBarva = record.fields['Typ Barva'] || 'Unknown';
            if (!byDay[day]) byDay[day] = {};
            if (!byDay[day][typBarva]) byDay[day][typBarva] = [];
            byDay[day][typBarva].push(record.fields);
        });
        
        Object.keys(byDay).sort().forEach(day => {
            console.log(`\nDEN ${day}:`);
            Object.keys(byDay[day]).forEach(type => {
                console.log(`  ${type}: ${byDay[day][type].length} items`);
                byDay[day][type].forEach(item => {
                    console.log(`    - ${item['Položka'] || item['Název jídla'] || 'No name'}`);
                });
            });
        });
        
    } catch (error) {
        console.error('Error:', error);
    }
}

debugE27();