const Airtable = require('airtable');

// Configuration
const apiKey = 'patBkFFXUTKxjfrH9.c4ae2004900da887054d1aa4f2dcc963b14556d5dce788fbe076df76073a6e83';
const baseId = 'appsLDyM9WHvamSmN';
const tableId = 'tblCHxatBEyaspzR3';

// Configure Airtable
const base = new Airtable({ apiKey: apiKey }).base(baseId);

async function findUniqueTemplates() {
    try {
        const records = await base(tableId).select({
            fields: ['ID Circuit', 'Template'],
            filterByFormula: 'NOT({Template} = "")'
        }).all();

        // Group by template to find unique combinations
        const templateGroups = {};
        const uniqueTemplates = new Set();
        
        records.forEach(record => {
            const template = record.get('Template');
            const idCircuit = record.get('ID Circuit');
            
            if (template) {
                uniqueTemplates.add(template);
                if (!templateGroups[template]) {
                    templateGroups[template] = [];
                }
                templateGroups[template].push(idCircuit);
            }
        });

        console.log(`\nFound ${uniqueTemplates.size} unique template combinations:\n`);
        
        // Sort templates and display with example IDs
        const sortedTemplates = Array.from(uniqueTemplates).sort();
        sortedTemplates.forEach((template, index) => {
            const exampleIds = templateGroups[template].slice(0, 3);
            console.log(`${index + 1}. ${template} - Examples: ${exampleIds.join(', ')}`);
        });
        
        // Return one example ID for each unique template
        const exampleIds = sortedTemplates.map(template => templateGroups[template][0]);
        
        console.log(`\nExample IDs for each template:\n${JSON.stringify(exampleIds, null, 2)}`);
        
        return { templates: sortedTemplates, exampleIds };
        
    } catch (error) {
        console.error('Error fetching data from Airtable:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    findUniqueTemplates()
        .then(result => {
            console.log(`\nTotal unique templates: ${result.templates.length}`);
        })
        .catch(console.error);
}

module.exports = { findUniqueTemplates };