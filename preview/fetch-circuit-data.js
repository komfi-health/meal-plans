const Airtable = require('airtable');

// Configuration
const apiKey = 'patBkFFXUTKxjfrH9.c4ae2004900da887054d1aa4f2dcc963b14556d5dce788fbe076df76073a6e83';
const baseId = 'appsLDyM9WHvamSmNT';
// Try different table names
const tableNames = ['CSV jídelníčky', 'Jídelníčky', 'tblCHxatBEyaspzR3'];

// Configure Airtable
const base = new Airtable({ apiKey: apiKey }).base(baseId);

async function fetchCircuitE27Data() {
    console.log('Fetching data for Circuit E_27...\n');
    
    // Try different table names
    for (const tableName of tableNames) {
        console.log(`Trying table: ${tableName}`);
        try {
            const records = await base(tableName)
                .select({
                    filterByFormula: `{ID Circuit} = 'Circuit E_27'`,
                    sort: [{ field: 'Den', direction: 'asc' }],
                    maxRecords: 100
                })
                .all();

        console.log(`Found ${records.length} records for Circuit E_27\n`);

        // Group data by day
        const dataByDay = {};
        
        records.forEach(record => {
            const fields = record.fields;
            const day = fields['Den'];
            
            if (!dataByDay[day]) {
                dataByDay[day] = {
                    client: fields['Klient'],
                    deliveryDate: fields['Datum rozvozu'],
                    template: fields['Template'],
                    meals: []
                };
            }
            
            dataByDay[day].meals.push({
                mealName: fields['Název jídla'],
                mealType: fields['Typ jídla'],
                mealTypeColor: fields['Typ Barva'],
                items: fields['Položka'],
                portions: fields['Poměr'],
                instructions: fields['Instrukce'],
                image: fields['@image']
            });
        });

        // Display the data
        Object.keys(dataByDay).sort().forEach(day => {
            const dayData = dataByDay[day];
            console.log(`=== Den ${day} ===`);
            console.log(`Klient: ${dayData.client}`);
            console.log(`Datum rozvozu: ${dayData.deliveryDate}`);
            console.log(`Template: ${dayData.template}`);
            console.log('\nJídla:');
            
            dayData.meals.forEach(meal => {
                console.log(`\n  ${meal.mealType} (${meal.mealTypeColor}): ${meal.mealName}`);
                if (meal.items) {
                    console.log(`  Položky: ${meal.items}`);
                }
                if (meal.portions) {
                    console.log(`  Porce: ${meal.portions}`);
                }
                if (meal.instructions) {
                    console.log(`  Instrukce: ${meal.instructions}`);
                }
                if (meal.image) {
                    console.log(`  Obrázek: ${meal.image}`);
                }
            });
            console.log('\n');
        });
        
        // If we found data, exit the loop
        return;

        } catch (error) {
            console.error(`Error with table ${tableName}:`, error.message);
        }
    }
}

// Run the script
fetchCircuitE27Data();