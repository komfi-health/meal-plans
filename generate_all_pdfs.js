const puppeteer = require('puppeteer');
const Airtable = require('airtable');
const fs = require('fs').promises;

// Configuration
const apiKey = 'patBkFFXUTKxjfrH9.c4ae2004900da887054d1aa4f2dcc963b14556d5dce788fbe076df76073a6e83';
const baseId = 'appsLDyM9WHvamSmN';
const tableId = 'tblCHxatBEyaspzR3';

// Configure Airtable
const base = new Airtable({ apiKey: apiKey }).base(baseId);

// Get all unique ID Circuits from Airtable
async function getAllIdCircuits() {
    console.log('Fetching all records from Airtable...');
    const idCircuits = new Set();
    
    try {
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
    } catch (error) {
        console.error('Error fetching records:', error);
        throw error;
    }
    
    const uniqueIds = Array.from(idCircuits).sort();
    console.log(`Found ${uniqueIds.length} unique ID Circuits`);
    return uniqueIds;
}

// Import the generatePDF function from the main script
const { spawn } = require('child_process');

async function generateSinglePDF(idCircuit) {
    return new Promise((resolve, reject) => {
        console.log(`Generating PDF for ${idCircuit}...`);
        const child = spawn('node', ['generate-improved-pdf.js', idCircuit]);
        
        let output = '';
        let errorOutput = '';
        
        child.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });
        
        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${idCircuit} completed`);
                resolve(output);
            } else {
                console.error(`❌ ${idCircuit} failed with code ${code}`);
                console.error(errorOutput);
                reject(new Error(`Process failed with code ${code}: ${errorOutput}`));
            }
        });
    });
}

async function generateAllPDFs() {
    try {
        const idCircuits = await getAllIdCircuits();
        console.log(`\nStarting generation of ${idCircuits.length} PDFs...\n`);
        
        let successCount = 0;
        let failCount = 0;
        
        for (const idCircuit of idCircuits) {
            try {
                await generateSinglePDF(idCircuit);
                successCount++;
            } catch (error) {
                console.error(`Failed to generate PDF for ${idCircuit}:`, error.message);
                failCount++;
            }
        }
        
        console.log(`\n=== GENERATION COMPLETE ===`);
        console.log(`✅ Successfully generated: ${successCount} PDFs`);
        console.log(`❌ Failed: ${failCount} PDFs`);
        console.log(`📁 All PDFs saved to: pdf/ directory`);
        
    } catch (error) {
        console.error('Error in batch generation:', error);
        process.exit(1);
    }
}

// Run the batch generation
generateAllPDFs()
    .then(() => {
        console.log('\n🎉 Batch PDF generation completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Batch PDF generation failed:', error);
        process.exit(1);
    });