const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs').promises;
const path = require('path');

// Example IDs for each unique template combination
const uniqueTemplateExamples = [
    { id: "E_27", template: "4x-O-SV2" },
    { id: "B_21", template: "4x-O-SV2-V" },
    { id: "E_16", template: "4x-O-V" },
    { id: "G_21", template: "4x-S-SV1-O" },
    { id: "F_01", template: "4x-SV1-O" },
    { id: "A_10", template: "5x-O" },
    { id: "A_29", template: "5x-O-V" },
    { id: "E_05", template: "5x-S-O-V" },
    { id: "A_04", template: "7x-O" },
    { id: "A_08", template: "7x-O-V" },
    { id: "E_10", template: "7x-S-O" },
    { id: "E_24", template: "7x-S-SV1-O-SV2" },
    { id: "F_03", template: "7x-S-SV1-V" }
];

async function generatePDFForId(id, template, index) {
    try {
        console.log(`\n[${index}/${uniqueTemplateExamples.length}] Generating PDF for ${id} (${template})...`);
        
        const startTime = Date.now();
        const { stdout, stderr } = await execAsync(`node generate-improved-pdf.js ${id}`);
        
        if (stderr) {
            console.error(`Warning for ${id}: ${stderr}`);
        }
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Successfully generated PDF for ${id} in ${elapsed}s`);
        
        // Extract PDF filename from stdout
        const match = stdout.match(/PDF saved as (.+\.pdf)/);
        if (match) {
            console.log(`   Saved to: ${match[1]}`);
        }
        
        return { id, template, success: true, time: elapsed };
    } catch (error) {
        console.error(`❌ Failed to generate PDF for ${id}: ${error.message}`);
        return { id, template, success: false, error: error.message };
    }
}

async function generateAllPDFs() {
    console.log(`Starting generation of ${uniqueTemplateExamples.length} unique template PDFs...`);
    console.log('=' . repeat(60));
    
    const startTime = Date.now();
    const results = [];
    
    // Generate PDFs sequentially to avoid memory issues
    for (let i = 0; i < uniqueTemplateExamples.length; i++) {
        const { id, template } = uniqueTemplateExamples[i];
        const result = await generatePDFForId(id, template, i + 1);
        results.push(result);
        
        // Small delay between generations
        if (i < uniqueTemplateExamples.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // Summary
    console.log('\n' + '=' . repeat(60));
    console.log('SUMMARY:');
    console.log('=' . repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`\nTotal PDFs generated: ${successful.length}/${uniqueTemplateExamples.length}`);
    
    if (successful.length > 0) {
        console.log('\nSuccessful:');
        successful.forEach(r => {
            console.log(`  ✅ ${r.id} (${r.template}) - ${r.time}s`);
        });
    }
    
    if (failed.length > 0) {
        console.log('\nFailed:');
        failed.forEach(r => {
            console.log(`  ❌ ${r.id} (${r.template}) - ${r.error}`);
        });
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nTotal time: ${totalTime}s`);
    
    // Create a summary file
    const summaryPath = 'local-preview/pdf/generation-summary.txt';
    const summaryContent = `PDF Generation Summary
Generated: ${new Date().toISOString()}
Total Time: ${totalTime}s

Successful (${successful.length}):
${successful.map(r => `- ${r.id} (${r.template}) - ${r.time}s`).join('\n')}

Failed (${failed.length}):
${failed.map(r => `- ${r.id} (${r.template}) - ${r.error}`).join('\n')}
`;
    
    await fs.writeFile(summaryPath, summaryContent);
    console.log(`\nSummary saved to: ${summaryPath}`);
}

// Run if called directly
if (require.main === module) {
    generateAllPDFs()
        .then(() => {
            console.log('\n✅ All done!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { generateAllPDFs };