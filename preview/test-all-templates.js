const Airtable = require('airtable');

// Configuration
const apiKey = 'patBkFFXUTKxjfrH9.c4ae2004900da887054d1aa4f2dcc963b14556d5dce788fbe076df76073a6e83';
const baseId = 'appsLDyM9WHvamSmN';
const tableId = 'tblCHxatBEyaspzR3';

// Configure Airtable
const base = new Airtable({ apiKey: apiKey }).base(baseId);

async function findAllTemplates() {
    console.log('Finding all template types...\n');
    
    try {
        const records = await base(tableId)
            .select({
                fields: ['ID Circuit', 'Template', 'Klient'],
                maxRecords: 1000
            })
            .all();
            
        console.log(`Found ${records.length} total records\n`);
        
        // Group by template type
        const templateGroups = {};
        const idCircuitByTemplate = {};
        
        records.forEach(record => {
            const template = record.fields['Template'];
            const idCircuit = record.fields['ID Circuit'];
            const client = record.fields['Klient'];
            
            if (template && idCircuit) {
                if (!templateGroups[template]) {
                    templateGroups[template] = 0;
                    idCircuitByTemplate[template] = {
                        idCircuit: idCircuit,
                        client: client
                    };
                }
                templateGroups[template]++;
            }
        });
        
        console.log('Template types found:');
        console.log('====================');
        Object.keys(templateGroups).sort().forEach(template => {
            const example = idCircuitByTemplate[template];
            console.log(`${template} (${templateGroups[template]} records)`);
            console.log(`  Example: ${example.idCircuit} - ${example.client}`);
            console.log('');
        });
        
        return Object.keys(templateGroups).map(template => ({
            template: template,
            idCircuit: idCircuitByTemplate[template].idCircuit,
            client: idCircuitByTemplate[template].client,
            count: templateGroups[template]
        }));
        
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

async function generateAllTemplatePDFs() {
    const templates = await findAllTemplates();
    
    if (templates.length === 0) {
        console.log('No templates found!');
        return;
    }
    
    console.log(`\nGenerating PDFs for ${templates.length} different template types...\n`);
    
    // Import the PDF generator
    const { spawn } = require('child_process');
    
    for (const template of templates) {
        console.log(`\n🔄 Generating PDF for template: ${template.template}`);
        console.log(`   ID Circuit: ${template.idCircuit}`);
        console.log(`   Client: ${template.client}`);
        
        try {
            await new Promise((resolve, reject) => {
                const child = spawn('node', ['generate-universal-pdf.js', template.idCircuit], {
                    stdio: 'inherit'
                });
                
                child.on('close', (code) => {
                    if (code === 0) {
                        console.log(`   ✅ Success!\n`);
                        resolve();
                    } else {
                        console.log(`   ❌ Failed with code ${code}\n`);
                        reject(new Error(`PDF generation failed for ${template.idCircuit}`));
                    }
                });
            });
            
            // Small delay between generations
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            console.error(`   Error generating PDF for ${template.idCircuit}:`, error.message);
        }
    }
    
    console.log('\n🎉 All template PDFs generated!');
    console.log('\nGenerated files:');
    templates.forEach(template => {
        console.log(`- jidelnicek_${template.idCircuit}_*.pdf (${template.template})`);
    });
}

// Run the test
generateAllTemplatePDFs()
    .then(() => {
        process.exit(0);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });