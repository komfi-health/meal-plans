const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const Airtable = require('airtable');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const apiKey = 'patBkFFXUTKxjfrH9.c4ae2004900da887054d1aa4f2dcc963b14556d5dce788fbe076df76073a6e83';
const baseId = 'appsLDyM9WHvamSmN';
const tableId = 'tblCHxatBEyaspzR3';

// Configure Airtable
const base = new Airtable({ apiKey: apiKey }).base(baseId);

// HTML Template
const htmlTemplate = `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jídelníček - {{klient}}</title>
    <style>
        @page { size: A4; margin: 0; }
        body { font-family: Arial, sans-serif; font-size: 11pt; color: #333; margin: 0; padding: 0; }
        .page { width: 210mm; min-height: 297mm; padding: 15mm; background: white; position: relative; box-sizing: border-box; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #f0f0f0; }
        .client-name { font-size: 24pt; font-weight: 300; }
        .meta-info { text-align: right; font-size: 10pt; color: #666; }
        .days-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; }
        .day-card { border: 1px solid #e0e0e0; border-radius: 16px; overflow: hidden; background: #fff; }
        .day-header { background: #f8f8f8; padding: 8px 15px; font-weight: bold; color: #555; border-bottom: 1px solid #eee; }
        .meal-section { padding: 10px 15px; border-bottom: 1px solid #f0f0f0; }
        .meal-section:last-child { border-bottom: none; }
        .meal-type-label { font-size: 9pt; color: #888; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; }
        .meal-content { display: flex; align-items: flex-start; gap: 10px; }
        .meal-image { width: 50px; height: 50px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
        .meal-details { flex: 1; }
        .meal-title { font-weight: bold; margin-bottom: 4px; }
        .meal-items { list-style: none; padding-left: 0; margin: 0; }
        .meal-items li { font-size: 9pt; color: #666; line-height: 1.4; }
        .instructions { font-size: 9pt; color: #666; background: #fafafa; border-radius: 5px; padding: 6px 8px; margin-top: 4px; }
        .footer { position: absolute; bottom: 15mm; left: 15mm; right: 15mm; border-top: 2px solid #f0f0f0; padding-top: 15px; }
        .contact-info { display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; }
        .contact-person { font-weight: bold; font-size: 12pt; }
        .contact-details { font-size: 10pt; color: #666; line-height: 1.5; }
        .logo { height: 40px; }
        .info-boxes { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 9pt; }
        .info-box { padding: 10px; background: #f8f8f8; border-radius: 5px; }
        .info-box h4 { margin: 0 0 5px 0; color: #d4a574; font-size: 10pt; }
        .info-box p { margin: 0; }
        @media print { .page { margin: 0; page-break-after: always; } }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <div class="client-name">{{klient}}</div>
            <div class="meta-info">
                <div>ID {{idCircuit}}</div>
                <div>Datum donášky {{datumDonaska}}</div>
            </div>
        </div>
        
        <div class="days-grid">
            {{#each days}}
            <div class="day-card">
                <div class="day-header">DEN {{this.den}}</div>
                {{#each this.meals}}
                <div class="meal-section">
                    <div class="meal-type-label">{{this.typeLabel}}</div>
                    {{#if this.items.length}}
                    <div class="meal-content">
                        {{#if this.image}}
                        <img src="{{this.image}}" alt="{{this.title}}" class="meal-image">
                        {{/if}}
                        <div class="meal-details">
                            {{#if this.title}}
                            <div class="meal-title">{{this.title}}</div>
                            {{/if}}
                            <ul class="meal-items">
                                {{#each this.items}}
                                <li>{{this.pomer}} {{this.nazev}}</li>
                                {{/each}}
                            </ul>
                            {{#if this.instructions}}
                            <div class="instructions">{{this.instructions}}</div>
                            {{/if}}
                        </div>
                    </div>
                    {{/if}}
                </div>
                {{/each}}
            </div>
            {{/each}}
        </div>
        
        <div class="footer">
            <div class="contact-info">
                <div>
                    <div class="contact-person">{{kontaktOsoba}}</div>
                    <div class="contact-details">
                        {{telefon}}<br>
                        {{email}}
                    </div>
                </div>
                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTIwIDQwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogICAgPHRleHQgeD0iNjAiIHk9IjI1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiNkNGE1NzQiPmtvbWZpPC90ZXh0Pgo8L3N2Zz4=" alt="komfi" class="logo">
            </div>
            <div class="info-boxes">
                <div class="info-box">
                    <h4>ZMĚNY</h4>
                    <p>Rádi byste změnili objednávku nebo vyřadili konkrétní jídlo? Ozvěte se nám do pondělí 9:00, abyste stihli změnu ještě v daném týdnu.</p>
                </div>
                <div class="info-box">
                    <h4>PRVNÍ OBJEDNÁVKA NA DOBÍRKU</h4>
                    <p>Dostali jste první objednávku na dobírku a chutnalo Vám? Ozvěte se nám do pondělí 9:00 pomocí chatu na webu, emailem nebo případně telefonicky. Objednávka se automaticky neobnovuje.</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

async function fetchE27Data() {
    console.log('Fetching data for E_27...');
    
    const records = await base(tableId)
        .select({
            filterByFormula: `{ID Circuit} = 'E_27'`,
            sort: [{ field: 'Den', direction: 'asc' }]
        })
        .all();
        
    return records.map(record => record.fields);
}

function transformDataForTemplate(menuData) {
    const dayGroups = {};
    
    // Get template type (4x-O-SV2)
    const templateType = menuData[0]?.['Template'] || '4x-O-SV2';
    const match = templateType.match(/(\d+)x([A-Z0-9\-]+)/);
    const daysCount = match ? parseInt(match[1], 10) : 4;
    
    // Mapping for meal types
    const mealTypeLabels = {
        'S': 'Snídaně',
        'SV1': 'Dopolední svačina',
        'O': 'Oběd',
        'SV2': 'Odpolední svačina',
        'V': 'Večeře'
    };
    
    // Group records by day
    menuData.forEach(item => {
        const day = item['Den'];
        if (!dayGroups[day]) {
            dayGroups[day] = {
                den: day,
                meals: []
            };
        }
        
        // Determine meal type from 'Typ Barva' field
        let mealType = null;
        const typBarva = item['Typ Barva'] || '';
        
        if (typBarva.includes('Oběd')) mealType = 'O';
        else if (typBarva.includes('Odp. svačina')) mealType = 'SV2';
        else if (typBarva.includes('Dop. svačina')) mealType = 'SV1';
        else if (typBarva.includes('Snídaně')) mealType = 'S';
        else if (typBarva.includes('Večeře')) mealType = 'V';
        
        // Find existing meal or create new one
        let meal = dayGroups[day].meals.find(m => m.type === mealType);
        if (!meal) {
            meal = {
                type: mealType,
                typeLabel: mealTypeLabels[mealType] || 'Jídlo',
                title: '',
                items: [],
                image: null,
                instructions: ''
            };
            dayGroups[day].meals.push(meal);
        }
        
        // Add item to meal
        if (item['Položka']) {
            meal.items.push({
                nazev: item['Položka'],
                pomer: item['Poměr'] || '1'
            });
        }
        
        // Set meal title if available
        if (item['Název jídla'] && !meal.title) {
            meal.title = item['Název jídla'];
        }
        
        // Set image if available
        if (item['@image'] && !meal.image) {
            const imagePath = item['@image'];
            if (imagePath.includes('/')) {
                meal.image = `https://raw.githubusercontent.com/komfi-health/meal-plans/main/${imagePath}`;
            } else {
                meal.image = `https://raw.githubusercontent.com/komfi-health/meal-plans/main/img/meals/${imagePath}`;
            }
        }
        
        // Set instructions if available
        if (item['Instrukce'] && !meal.instructions) {
            meal.instructions = item['Instrukce'];
        }
    });
    
    // Sort meals within each day by meal type order
    const mealOrder = ['S', 'SV1', 'O', 'SV2', 'V'];
    Object.values(dayGroups).forEach(day => {
        day.meals.sort((a, b) => {
            const orderA = mealOrder.indexOf(a.type);
            const orderB = mealOrder.indexOf(b.type);
            return orderA - orderB;
        });
    });
    
    // Convert to array and sort by day
    const days = Object.values(dayGroups)
        .sort((a, b) => a.den - b.den)
        .slice(0, daysCount);
    
    const firstRecord = menuData[0] || {};
    
    return {
        klient: firstRecord['Klient'] || 'Klient',
        idCircuit: 'E_27',
        datumDonaska: firstRecord['Datum rozvozu'] || '',
        kontaktOsoba: 'Jiří Žilka',
        telefon: '734 602 600',
        email: 'zakaznici@budtekomfi.cz',
        days: days,
        templateType: templateType
    };
}

async function generatePDF() {
    try {
        // Fetch data
        const menuData = await fetchE27Data();
        console.log(`Found ${menuData.length} records`);
        
        // Transform data
        const templateData = transformDataForTemplate(menuData);
        console.log('Template type:', templateData.templateType);
        console.log('Days count:', templateData.days.length);
        
        // Compile template
        const template = handlebars.compile(htmlTemplate);
        const html = template(templateData);
        
        // Save HTML for debugging
        await fs.writeFile('e27-debug.html', html);
        console.log('Debug HTML saved to e27-debug.html');
        
        // Launch Puppeteer
        console.log('Launching Puppeteer...');
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        // Generate PDF
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });
        
        await browser.close();
        
        // Save PDF
        const filename = `jidelnicek_E_27_${Date.now()}.pdf`;
        await fs.writeFile(filename, pdf);
        console.log(`PDF saved as ${filename}`);
        
        return filename;
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
}

// Run the generator
generatePDF()
    .then(filename => {
        console.log(`\n✅ PDF successfully generated: ${filename}`);
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Failed to generate PDF:', error);
        process.exit(1);
    });