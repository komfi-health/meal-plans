const { spawn } = require('child_process');

// List of all 7x-O template IDs
const ids7xO = [
    'A_03', 'A_04', 'A_12', 'A_15', 'A_18', 'A_19', 'A_24', 'A_25', 'A_26', 'A_28',
    'A_32', 'A_33', 'A_34', 'A_36', 'A_38', 'B_07', 'B_09', 'B_12', 'B_15', 'B_17',
    'B_25', 'B_29', 'B_32', 'B_35', 'B_39', 'B_40', 'C_16', 'C_21', 'E_02', 'E_03',
    'E_04', 'E_08', 'E_11', 'E_12', 'E_18', 'E_22', 'E_23', 'E_25', 'E_26', 'E_29',
    'E_35', 'F_02', 'F_08', 'F_16', 'F_17', 'F_25', 'G_03', 'G_07', 'G_08', 'G_10',
    'G_13', 'G_14', 'G_15', 'G_16', 'G_17', 'G_18', 'G_29', 'G_30', 'G_35'
];

async function regenerateSinglePDF(idCircuit) {
    return new Promise((resolve, reject) => {
        console.log(`Regenerating PDF for ${idCircuit}...`);
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
                console.log(`✅ ${idCircuit} regenerated`);
                resolve(output);
            } else {
                console.error(`❌ ${idCircuit} failed with code ${code}`);
                console.error(errorOutput);
                reject(new Error(`Process failed with code ${code}: ${errorOutput}`));
            }
        });
    });
}

async function regenerateAll7xO() {
    console.log(`Starting regeneration of ${ids7xO.length} 7x-O PDFs...\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const idCircuit of ids7xO) {
        try {
            await regenerateSinglePDF(idCircuit);
            successCount++;
        } catch (error) {
            console.error(`Failed to regenerate PDF for ${idCircuit}:`, error.message);
            failCount++;
        }
    }
    
    console.log(`\n=== REGENERATION COMPLETE ===`);
    console.log(`✅ Successfully regenerated: ${successCount} PDFs`);
    console.log(`❌ Failed: ${failCount} PDFs`);
}

regenerateAll7xO()
    .then(() => {
        console.log('\n🎉 7x-O PDFs regeneration completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Regeneration failed:', error);
        process.exit(1);
    });