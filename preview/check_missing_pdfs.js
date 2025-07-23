const Airtable = require('airtable');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const apiKey = 'patBkFFXUTKxjfrH9.c4ae2004900da887054d1aa4f2dcc963b14556d5dce788fbe076df76073a6e83';
const baseId = 'appsLDyM9WHvamSmN';
const tableId = 'tblCHxatBEyaspzR3';

// Configure Airtable
const base = new Airtable({ apiKey: apiKey }).base(baseId);

async function getAllIdCircuits() {
    const idCircuits = new Set();
    
    await base(tableId)
        .select({
            fields: ['ID Circuit']
        })
        .eachPage((records, fetchNextPage) => {
            records.forEach(record => {
                const idCircuit = record.fields['ID Circuit'];
                if (idCircuit) {
                    idCircuits.add(idCircuit);
                }
            });
            fetchNextPage();
        });
    
    return Array.from(idCircuits).sort();
}

async function getExistingPdfs() {
    try {
        const files = await fs.readdir('pdf');
        const pdfFiles = files.filter(file => file.endsWith('.pdf') && !file.startsWith('jidelnicek_'));
        return pdfFiles.map(file => file.split('-')[0]); // Extract ID Circuit from filename
    } catch (error) {
        console.error('Error reading pdf directory:', error);
        return [];
    }
}

async function findMissingPdfs() {
    console.log('Checking for missing PDFs...');
    
    const allIdCircuits = await getAllIdCircuits();
    const existingPdfs = await getExistingPdfs();
    const existingSet = new Set(existingPdfs);
    
    const missing = allIdCircuits.filter(id => !existingSet.has(id));
    
    console.log(`Total ID Circuits in database: ${allIdCircuits.length}`);
    console.log(`Existing PDFs: ${existingPdfs.length}`);
    console.log(`Missing PDFs: ${missing.length}`);
    
    if (missing.length > 0) {
        console.log('\nMissing PDF IDs:');
        missing.forEach(id => console.log(id));
    } else {
        console.log('\n✅ All PDFs are generated!');
    }
    
    return missing;
}

findMissingPdfs()
    .then(missing => {
        if (missing.length > 0) {
            console.log(`\nNeed to generate ${missing.length} missing PDFs`);
        }
        process.exit(0);
    })
    .catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });