const Airtable = require('airtable');

// Configuration
const apiKey = 'patBkFFXUTKxjfrH9.c4ae2004900da887054d1aa4f2dcc963b14556d5dce788fbe076df76073a6e83';
const baseId = 'appsLDyM9WHvamSmNT';

// Configure Airtable
const base = new Airtable({ apiKey: apiKey }).base(baseId);

async function testAccess() {
    console.log('Testing Airtable access...\n');
    
    // Test with table ID
    try {
        console.log('Attempting to fetch first record from table ID: tblCHxatBEyaspzR3');
        const records = await base('tblCHxatBEyaspzR3')
            .select({
                maxRecords: 3,
                view: "Grid view"
            })
            .firstPage();
            
        console.log(`Success! Found ${records.length} records`);
        
        if (records.length > 0) {
            console.log('\nFirst record fields:');
            console.log(Object.keys(records[0].fields));
            
            console.log('\nSample data from first record:');
            const fields = records[0].fields;
            console.log('ID Circuit:', fields['ID Circuit']);
            console.log('Klient:', fields['Klient']);
            console.log('Template:', fields['Template']);
        }
        
    } catch (error) {
        console.error('Error:', error.error, '-', error.message);
        console.error('Status code:', error.statusCode);
    }
}

testAccess();