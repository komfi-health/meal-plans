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

// Register Handlebars helpers
handlebars.registerHelper('isLayoutType', function(layout, type, options) {
    return layout === type ? options.fn(this) : options.inverse(this);
});

handlebars.registerHelper('getGridColumns', function(layout, daysCount) {
    if (layout === 'big-cards') return Math.min(daysCount, 3);
    if (layout === 'text-only' && daysCount >= 6) return 3;
    return 2;
});

// Universal HTML Template
const htmlTemplate = `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jídelníček - {{klient}}</title>
    <style>
        @page { size: A4; margin: 0; }
        body { font-family: Arial, sans-serif; font-size: 11pt; color: #333; margin: 0; padding: 0; }
        .page { 
            width: 210mm; 
            min-height: 297mm; 
            padding: 15mm; 
            background: white; 
            position: relative; 
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
        }
        .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 20px; 
            padding-bottom: 10px; 
            border-bottom: 2px solid #f0f0f0; 
        }
        .client-name { font-size: 24pt; font-weight: 300; }
        .meta-info { text-align: right; font-size: 10pt; color: #666; }
        
        /* Content area that grows */
        .content { flex: 1; margin-bottom: 120px; }
        
        /* Grid layouts */
        .days-grid { 
            display: grid; 
            gap: 15px; 
            margin-bottom: 30px;
        }
        .days-grid-2 { grid-template-columns: repeat(2, 1fr); }
        .days-grid-3 { grid-template-columns: repeat(3, 1fr); }
        
        /* Day cards */
        .day-card { 
            border: 1px solid #e0e0e0; 
            border-radius: 16px; 
            overflow: hidden; 
            background: #fff;
            display: flex;
            flex-direction: column;
        }
        .day-header { 
            background: #f8f8f8; 
            padding: 8px 15px; 
            font-weight: bold; 
            color: #555; 
            border-bottom: 1px solid #eee; 
        }
        
        /* Big cards layout (single meal type) */
        .big-card-content {
            padding: 20px;
            text-align: center;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .big-meal-image {
            width: 120px;
            height: 120px;
            border-radius: 12px;
            object-fit: cover;
            margin: 0 auto 15px;
        }
        .big-meal-title {
            font-size: 14pt;
            font-weight: bold;
            color: #333;
            line-height: 1.3;
        }
        
        /* Standard cards layout (multiple meal types with images) */
        .meal-section { 
            padding: 10px 15px; 
            border-bottom: 1px solid #f0f0f0; 
        }
        .meal-section:last-child { border-bottom: none; }
        .meal-type-label { 
            font-size: 9pt; 
            color: #888; 
            text-transform: uppercase; 
            font-weight: bold; 
            margin-bottom: 4px; 
        }
        .meal-content { display: flex; align-items: flex-start; gap: 10px; }
        .meal-image { 
            width: 50px; 
            height: 50px; 
            border-radius: 8px; 
            object-fit: cover; 
            flex-shrink: 0; 
        }
        .meal-details { flex: 1; }
        .meal-title { font-weight: bold; margin-bottom: 4px; font-size: 10pt; }
        .meal-items { list-style: none; padding-left: 0; margin: 0; }
        .meal-items li { font-size: 9pt; color: #666; line-height: 1.4; }
        
        /* Text-only layout (no images) */
        .text-only .meal-section { padding: 8px 12px; }
        .text-only .meal-type-label { font-size: 8pt; margin-bottom: 2px; }
        .text-only .meal-title { font-size: 9pt; }
        .text-only .meal-items li { font-size: 8pt; line-height: 1.3; }
        .text-only .day-card { min-height: auto; }
        .text-only .days-grid { gap: 10px; }
        
        /* Footer */
        .footer { 
            position: absolute; 
            bottom: 15mm; 
            left: 15mm; 
            right: 15mm; 
            border-top: 2px solid #f0f0f0; 
            padding-top: 15px; 
        }
        .contact-info { 
            display: flex; 
            justify-content: space-between; 
            align-items: start; 
            margin-bottom: 15px; 
        }
        .contact-person { font-weight: bold; font-size: 12pt; }
        .contact-details { font-size: 10pt; color: #666; line-height: 1.5; }
        .logo { height: 40px; }
        .info-boxes { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            font-size: 9pt; 
        }
        .info-box { 
            padding: 10px; 
            background: #f8f8f8; 
            border-radius: 5px; 
        }
        .info-box h4 { 
            margin: 0 0 5px 0; 
            color: #d4a574; 
            font-size: 10pt; 
        }
        .info-box p { margin: 0; }
        
        /* Instructions */
        .instructions { 
            font-size: 8pt; 
            color: #666; 
            background: #fafafa; 
            border-radius: 5px; 
            padding: 4px 6px; 
            margin-top: 4px; 
        }
        
        /* Second page if needed */
        .page-2 { page-break-before: always; }
        
        @media print { 
            .page { margin: 0; page-break-after: always; }
            .text-only { font-size: 9pt; }
        }
    </style>
</head>
<body>
    <div class="page {{#isLayoutType layoutType 'text-only'}}text-only{{/isLayoutType}}">
        <div class="header">
            <div class="client-name">{{klient}}</div>
            <div class="meta-info">
                <div>ID {{idCircuit}}</div>
                <div>Datum donášky {{datumDonaska}}</div>
            </div>
        </div>
        
        <div class="content">
            {{#isLayoutType layoutType 'big-cards'}}
            <!-- Big cards layout - single meal type -->
            <div class="days-grid days-grid-{{getGridColumns layoutType daysCount}}">
                {{#each days}}
                <div class="day-card">
                    <div class="day-header">DEN {{this.den}}</div>
                    <div class="big-card-content">
                        {{#with this.meals.[0]}}
                        {{#if this.image}}
                        <img src="{{this.image}}" alt="{{this.title}}" class="big-meal-image">
                        {{/if}}
                        <div class="big-meal-title">{{this.title}}</div>
                        {{/with}}
                    </div>
                </div>
                {{/each}}
            </div>
            {{/isLayoutType}}
            
            {{#isLayoutType layoutType 'standard'}}
            <!-- Standard layout - multiple meal types with images -->
            <div class="days-grid days-grid-2">
                {{#each days}}
                <div class="day-card">
                    <div class="day-header">DEN {{this.den}}</div>
                    {{#each this.meals}}
                    <div class="meal-section">
                        <div class="meal-type-label">{{this.typeLabel}}</div>
                        {{#if this.title}}
                        <div class="meal-content">
                            {{#if this.image}}
                            <img src="{{this.image}}" alt="{{this.title}}" class="meal-image">
                            {{/if}}
                            <div class="meal-details">
                                <div class="meal-title">{{this.title}}</div>
                                {{#if this.items.length}}
                                <ul class="meal-items">
                                    {{#each this.items}}
                                    <li>{{#if this.showPortion}}{{this.pomer}} {{/if}}{{this.nazev}}</li>
                                    {{/each}}
                                </ul>
                                {{/if}}
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
            {{/isLayoutType}}
            
            {{#isLayoutType layoutType 'text-only'}}
            <!-- Text-only layout - no images -->
            <div class="days-grid days-grid-{{getGridColumns layoutType daysCount}}">
                {{#each days}}
                <div class="day-card">
                    <div class="day-header">DEN {{this.den}}</div>
                    {{#each this.meals}}
                    <div class="meal-section">
                        <div class="meal-type-label">{{this.typeLabel}}</div>
                        {{#if this.items.length}}
                        <div class="meal-details">
                            {{#if this.title}}
                            <div class="meal-title">{{this.title}}</div>
                            {{/if}}
                            <ul class="meal-items">
                                {{#each this.items}}
                                <li>{{this.pomer}} {{this.nazev}}</li>
                                {{/each}}
                            </ul>
                        </div>
                        {{/if}}
                    </div>
                    {{/each}}
                </div>
                {{/each}}
            </div>
            {{/isLayoutType}}
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

async function fetchData(idCircuit) {
    console.log(`Fetching data for ${idCircuit}...`);
    
    const records = await base(tableId)
        .select({
            filterByFormula: `{ID Circuit} = '${idCircuit}'`,
            sort: [{ field: 'Den', direction: 'asc' }]
        })
        .all();
        
    return records.map(record => record.fields);
}

function determineLayoutType(templateType, daysCount, mealTypesCount) {
    // Parse template type
    const match = templateType.match(/(\d+)x([A-Z0-9\-]+)/);
    if (!match) return 'standard';
    
    const mealTypes = match[2].split('-');
    
    // Big cards layout: only one meal type AND 5 or fewer days
    if (mealTypes.length === 1 && daysCount <= 5) {
        return 'big-cards';
    }
    
    // Text-only layout: 3+ meal types per day OR 6+ days
    if (mealTypes.length >= 3 || daysCount >= 6) {
        return 'text-only';
    }
    
    // Standard layout: 2 meal types with images
    return 'standard';
}

function transformDataForTemplate(menuData) {
    const dayGroups = {};
    
    // Get template type
    const templateType = menuData[0]?.['Template'] || '5x-O';
    const match = templateType.match(/(\d+)x([A-Z0-9\-]+)/);
    const daysCount = match ? parseInt(match[1], 10) : 5;
    const mealTypeString = match ? match[2] : 'O';
    
    // Parse meal types from template
    const mealTypeOrder = ['S', 'SV1', 'O', 'SV2', 'V'];
    const requestedMealTypes = mealTypeString.split('-');
    const activeMealTypes = mealTypeOrder.filter(mt => requestedMealTypes.includes(mt));
    
    // Determine layout type
    const layoutType = determineLayoutType(templateType, daysCount, activeMealTypes.length);
    console.log(`Layout type: ${layoutType} for template ${templateType}`);
    
    // Mapping for meal types
    const mealTypeLabels = {
        'S': 'Snídaně',
        'SV1': 'Dopolední svačina',
        'O': 'Oběd',
        'SV2': 'Odpolední svačina',
        'V': 'Večeře'
    };
    
    // Czech name mappings
    const czechToCode = {
        'Snídaně': 'S',
        'Dop. svačina': 'SV1',
        'Oběd': 'O',
        'Odp. svačina': 'SV2',
        'Večeře': 'V',
        '🟡 Snídaně': 'S',
        '🟠 Odp. svačina': 'SV2',
        '🟣 Oběd': 'O',
        '🟢 Dop. svačina': 'SV1',
        '🔵 Večeře': 'V',
        '⚪ Večeře': 'V',
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
        
        // Determine meal type - use only Typ Barva field
        let mealType = null;
        
        if (item['Typ Barva']) {
            const typBarva = item['Typ Barva'];
            
            // Direct mapping
            if (typBarva.includes('Oběd')) mealType = 'O';
            else if (typBarva.includes('Odp. svačina')) mealType = 'SV2';
            else if (typBarva.includes('Dop. svačina')) mealType = 'SV1';
            else if (typBarva.includes('Snídaně')) mealType = 'S';
            else if (typBarva.includes('Večeře')) mealType = 'V';
        }
        
        // Skip if meal type not in active types
        if (!mealType || !activeMealTypes.includes(mealType)) return;
        
        // Find existing meal or create new one
        let meal = dayGroups[day].meals.find(m => m.type === mealType);
        if (!meal) {
            meal = {
                type: mealType,
                typeLabel: mealTypeLabels[mealType],
                title: '',
                items: [],
                image: null,
                instructions: ''
            };
            dayGroups[day].meals.push(meal);
        }
        
        // Add item to meal
        if (item['Položka']) {
            // For main meals, always show items (including soups for dinner)
            const isMainMeal = ['O', 'V'].includes(mealType);
            
            meal.items.push({
                nazev: item['Položka'],
                pomer: item['Poměr'] || '1',
                showPortion: !isMainMeal // Hide portion for main meals but show items
            });
        }
        
        // Set meal title (only once)
        if (item['Název jídla'] && item['Název jídla'] !== 'undefined' && !meal.title) {
            meal.title = item['Název jídla'];
        }
        
        // Set image (only for layouts that show images)
        if (layoutType !== 'text-only' && !meal.image) {
            if (item['@image'] && item['@image'] !== 'img/meals/.png') {
                // Use actual meal image
                const imagePath = item['@image'];
                if (imagePath.includes('/')) {
                    meal.image = `https://raw.githubusercontent.com/komfi-health/meal-plans/main/${imagePath}`;
                } else {
                    meal.image = `https://raw.githubusercontent.com/komfi-health/meal-plans/main/img/meals/${imagePath}`;
                }
            } else {
                // Use placeholder image from GitHub for meal type
                meal.image = `https://raw.githubusercontent.com/komfi-health/meal-plans/main/img/meals/placeholders/${mealType}.png`;
            }
        }
        
        // Set instructions
        if (item['Instrukce'] && !meal.instructions) {
            meal.instructions = item['Instrukce'];
        }
    });
    
    // Sort meals within each day by meal type order
    Object.values(dayGroups).forEach(day => {
        day.meals.sort((a, b) => {
            const orderA = mealTypeOrder.indexOf(a.type);
            const orderB = mealTypeOrder.indexOf(b.type);
            return orderA - orderB;
        });
    });
    
    // Convert to array and sort by day
    const days = Object.values(dayGroups)
        .sort((a, b) => a.den - b.den)
        .slice(0, daysCount);
    
    // For big cards layout, ensure we only have the main meal
    if (layoutType === 'big-cards') {
        days.forEach(day => {
            // Keep only the main meal type (usually lunch)
            const mainMeal = day.meals.find(m => m.type === activeMealTypes[0]);
            day.meals = mainMeal ? [mainMeal] : [];
        });
    }
    
    const firstRecord = menuData[0] || {};
    
    return {
        klient: firstRecord['Klient'] || 'Klient',
        idCircuit: firstRecord['ID Circuit'] || '',
        datumDonaska: firstRecord['Datum rozvozu'] || '',
        kontaktOsoba: 'Jiří Žilka',
        telefon: '734 602 600',
        email: 'zakaznici@budtekomfi.cz',
        days: days,
        daysCount: daysCount,
        templateType: templateType,
        layoutType: layoutType
    };
}

async function generatePDF(idCircuit = 'E_27') {
    try {
        // Fetch data
        const menuData = await fetchData(idCircuit);
        console.log(`Found ${menuData.length} records`);
        
        if (menuData.length === 0) {
            throw new Error(`No data found for ID Circuit: ${idCircuit}`);
        }
        
        // Transform data
        const templateData = transformDataForTemplate(menuData);
        console.log('Template:', templateData.templateType);
        console.log('Layout:', templateData.layoutType);
        console.log('Days:', templateData.daysCount);
        
        // Compile template
        const template = handlebars.compile(htmlTemplate);
        const html = template(templateData);
        
        // Save HTML for debugging
        const debugFile = `${idCircuit}-debug.html`;
        await fs.writeFile(debugFile, html);
        console.log(`Debug HTML saved to ${debugFile}`);
        
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
        const filename = `jidelnicek_${idCircuit}_${Date.now()}.pdf`;
        await fs.writeFile(filename, pdf);
        console.log(`PDF saved as ${filename}`);
        
        return filename;
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
}

// Run with command line argument or default to E_27
const idCircuit = process.argv[2] || 'E_27';
generatePDF(idCircuit)
    .then(filename => {
        console.log(`\n✅ PDF successfully generated: ${filename}`);
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Failed to generate PDF:', error);
        process.exit(1);
    });