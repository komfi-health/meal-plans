const { spawn } = require('child_process');

// List of all 5x-O template IDs
const ids5xO = ["_01","A_01","A_05","A_06","A_07","A_10","A_11","A_13","A_14","A_16","A_17","A_21","A_22","A_23","A_30","A_31","A_35","A_37","B_01","B_02","B_03","B_04","B_05","B_06","B_08","B_10","B_11","B_13","B_14","B_16","B_19","B_20","B_22","B_23","B_24","B_26","B_27","B_28","B_30","B_31","B_33","B_34","B_36","B_37","C_01","C_02","C_03","C_04","C_05","C_06","C_07","C_08","C_09","C_10","C_11","C_12","C_13","C_14","C_15","C_17","C_18","C_19","C_20","C_22","C_23","E_01","E_07","E_09","E_14","E_15","E_19","E_20","E_28","E_30","E_31","E_32","E_33","E_34","F_05","F_06","F_09","F_10","F_11","F_12","F_13","F_14","F_15","F_20","F_22","F_23","F_26","G_05","G_06","G_09","G_11","G_12","G_19","G_20","G_22","G_23","G_24","G_25","G_26","G_27","G_28","G_32","G_33","G_34","G_36"];

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

async function regenerateAll5xO() {
    console.log(`Starting regeneration of ${ids5xO.length} 5x-O PDFs...\n`);
    
    let successCount = 0;
    let failCount = 0;
    const failed = [];
    
    for (const idCircuit of ids5xO) {
        try {
            await regenerateSinglePDF(idCircuit);
            successCount++;
        } catch (error) {
            console.error(`Failed to regenerate PDF for ${idCircuit}:`, error.message);
            failCount++;
            failed.push(idCircuit);
        }
    }
    
    console.log(`\n=== REGENERATION COMPLETE ===`);
    console.log(`✅ Successfully regenerated: ${successCount} PDFs`);
    console.log(`❌ Failed: ${failCount} PDFs`);
    
    if (failed.length > 0) {
        console.log('\nFailed IDs:', failed.join(', '));
    }
}

regenerateAll5xO()
    .then(() => {
        console.log('\n🎉 5x-O PDFs regeneration completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Regeneration failed:', error);
        process.exit(1);
    });