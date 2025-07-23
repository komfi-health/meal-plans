const Airtable = require('airtable');

// Configuration
const apiKey = 'patBkFFXUTKxjfrH9.c4ae2004900da887054d1aa4f2dcc963b14556d5dce788fbe076df76073a6e83';
const baseId = 'appsLDyM9WHvamSmN';
const tableId = 'tblCHxatBEyaspzR3';

// Configure Airtable
const base = new Airtable({ apiKey: apiKey }).base(baseId);

async function showE27Data() {
    console.log('Fetching data for E_27...\n');
    
    try {
        const records = await base(tableId)
            .select({
                filterByFormula: `{ID Circuit} = 'E_27'`,
                sort: [{ field: 'Den', direction: 'asc' }]
            })
            .all();
            
        console.log(`Found ${records.length} records for E_27\n`);
        
        // Group by day
        const byDay = {};
        
        records.forEach(record => {
            const day = record.fields['Den'] || 'Unknown';
            if (!byDay[day]) {
                byDay[day] = [];
            }
            byDay[day].push(record.fields);
        });
        
        // Display data organized by day
        Object.keys(byDay).sort().forEach(day => {
            console.log(`\n========== DEN ${day} ==========`);
            const dayRecords = byDay[day];
            
            if (dayRecords.length > 0) {
                console.log(`Klient: ${dayRecords[0]['Klient']}`);
                console.log(`Datum rozvozu: ${dayRecords[0]['Datum rozvozu']}`);
                console.log(`Template: ${dayRecords[0]['Template']}`);
                console.log(`\nJídla pro tento den:`);
                
                dayRecords.forEach(meal => {
                    console.log(`\n  ${meal['Typ Barva'] || meal['Typ jídla'] || 'Typ neznámý'}`);
                    console.log(`  Název: ${meal['Název jídla']}`);
                    if (meal['Položka']) {
                        console.log(`  Položky: ${meal['Položka']}`);
                    }
                    if (meal['Poměr']) {
                        console.log(`  Porce: ${meal['Poměr']}`);
                    }
                    if (meal['@image']) {
                        console.log(`  Obrázek: ${meal['@image']}`);
                    }
                });
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
    }
}

showE27Data();