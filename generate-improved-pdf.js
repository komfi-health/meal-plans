const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const Airtable = require('airtable');
const fs = require('fs').promises;

// Configuration
const apiKey = 'patBkFFXUTKxjfrH9.c4ae2004900da887054d1aa4f2dcc963b14556d5dce788fbe076df76073a6e83';
const baseId = 'appsLDyM9WHvamSmN';
const tableId = 'tblCHxatBEyaspzR3';

// Configure Airtable
const base = new Airtable({ apiKey: apiKey }).base(baseId);

// Load SVG icons and cache them
const svgCache = {};

async function loadSvgIcon(iconType) {
    if (svgCache[iconType]) {
        return svgCache[iconType];
    }
    
    try {
        const svgPath = `img/meals/placeholders/${iconType}-small.svg`;
        const svgContent = await fs.readFile(svgPath, 'utf8');
        svgCache[iconType] = svgContent;
        return svgContent;
    } catch (error) {
        console.warn(`Could not load SVG for ${iconType}:`, error.message);
        return null;
    }
}

// Calendar icon SVG (Material Design - filled)
const calendarIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
</svg>`;

// Register Handlebars helpers
handlebars.registerHelper('isLayoutType', function(layout, type, options) {
    return layout === type ? options.fn(this) : options.inverse(this);
});

handlebars.registerHelper('eq', function(a, b) {
    return a === b;
});

handlebars.registerHelper('mod', function(a, b) {
    return a % b;
});

handlebars.registerHelper('gt', function(a, b) {
    return a > b;
});

// Improved HTML Template with better layout
const htmlTemplate = `<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jídelníček - {{klient}}</title>
    <style>
        @font-face {
            font-family: 'Gambarino';
            src: url('https://raw.githubusercontent.com/komfi-health/meal-plans/main/fonts/Gambarino-Regular.otf') format('opentype'),
                 url('https://raw.githubusercontent.com/komfi-health/meal-plans/main/fonts/Gambarino-Regular.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
        }
        @font-face {
            font-family: 'Satoshi';
            src: url('https://raw.githubusercontent.com/komfi-health/meal-plans/main/fonts/Satoshi-Light.otf') format('opentype');
            font-weight: 300;
            font-style: normal;
        }
        @font-face {
            font-family: 'Satoshi';
            src: url('https://raw.githubusercontent.com/komfi-health/meal-plans/main/fonts/Satoshi-Regular.otf') format('opentype');
            font-weight: 400;
            font-style: normal;
        }
        @font-face {
            font-family: 'Satoshi';
            src: url('https://raw.githubusercontent.com/komfi-health/meal-plans/main/fonts/Satoshi-Medium.otf') format('opentype');
            font-weight: 500;
            font-style: normal;
        }
        @font-face {
            font-family: 'Satoshi';
            src: url('https://raw.githubusercontent.com/komfi-health/meal-plans/main/fonts/Satoshi-Bold.otf') format('opentype');
            font-weight: 700;
            font-style: normal;
        }
        @font-face {
            font-family: 'Satoshi';
            src: url('https://raw.githubusercontent.com/komfi-health/meal-plans/main/fonts/Satoshi-Black.otf') format('opentype');
            font-weight: 900;
            font-style: normal;
        }
        @page { size: A4; margin: 0; }
        body { font-family: 'Satoshi'; font-size: 11pt; color: #333; margin: 0; padding: 0; }
        .page { 
            width: 210mm; 
            min-height: 297mm;
            background: white; 
            position: relative; 
            box-sizing: border-box;
            padding: 0;
        }
        /* Single page constraint only for short 4-day layouts */
        .page.single-page-only { 
            height: 297mm;
            overflow: hidden;
        }
        .header { 
            position: fixed;
            top: 8mm;
            left: 10mm;
            right: 10mm;
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 15px; 
            padding-bottom: 8px; 
            border-bottom: 2px solid #f0f0f0; 
            background: white;
            z-index: 999;
            height: 20mm;
        }
        .client-name { font-family: 'Gambarino'; font-size: 18pt; font-weight: normal; letter-spacing: -0.025em; }
        .meta-info { text-align: right; font-size: 10pt; color: #666; font-weight: 400; }
        
        /* Content area - adjusted margin for proper footer placement */
        .content { 
            margin: 35mm 10mm 35mm 10mm;
            position: relative;
            z-index: 1;
        }
        
        /* Grid layouts with synchronized meal section heights */
        .days-grid { 
            display: grid; 
            gap: 8px; 
            margin-bottom: 10px;
            align-items: start;
        }
        .days-grid-2 { 
            grid-template-columns: repeat(2, 1fr);
            grid-auto-rows: max-content;
        }
        .days-grid-3 { 
            grid-template-columns: repeat(3, 1fr);
            grid-auto-rows: max-content;
        }
        
        /* Force equal heights only for cards in same row, not whole grid - standard layouts only */
        .page:not(.text-image-mix) .days-grid {
            align-items: stretch;
        }
        /* Reset alignment for text-image-mix to prevent large gaps */
        .text-image-mix .days-grid {
            align-items: start;
        }
        
        /* Day cards - compact layout */
        .day-card { 
            border: 1px solid #e0e0e0; 
            border-radius: 16px; 
            overflow: hidden; 
            background: #fff;
            display: flex;
            flex-direction: column;
            height: fit-content;
        }
        .day-card-content {
            display: flex;
            flex-direction: column;
            flex: 1;
        }
        .day-header { 
            background: #F1E4BE; 
            padding: 3px 18px; 
            font-weight: 700; 
            color: #555; 
            border-bottom: 1px solid #eee;
            font-size: 7pt;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .day-header-icon {
            width: 10px;
            height: 10px;
            flex-shrink: 0;
        }
        
        /* Big cards layout (single meal type) - much bigger */
        .big-card-content {
            padding: 40px 20px;
            text-align: center;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .big-meal-image {
            width: 160px;
            height: 160px;
            border-radius: 12px;
            object-fit: cover;
            margin: 0 auto 20px;
        }
        .big-meal-title {
            font-size: 20pt;
            font-weight: 700;
            color: #333;
            line-height: 1.3;
        }
        
        /* Standard cards layout - compact with minimal heights */
        .meal-section { 
            padding: 8px 12px; 
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            flex-direction: column;
        }
        .meal-section:last-child { border-bottom: none; }
        .meal-type-label { 
            font-size: 8pt; 
            color: #888; 
            text-transform: uppercase; 
            font-weight: 600; 
            margin-bottom: 6px; 
            letter-spacing: 0.8px;
            display: flex;
            align-items: center;
            gap: 6px;
            padding-left: 0px;
        }
        .meal-type-icon {
            width: 10px;
            height: 10px;
            flex-shrink: 0;
        }
        .meal-content { display: flex; align-items: flex-start; gap: 15px; flex: 1; }
        .meal-image { 
            width: 75px; 
            height: 75px; 
            border-radius: 6px; 
            object-fit: cover; 
            flex-shrink: 0; 
        }
        .meal-details { flex: 1; }
        .meal-title { font-weight: 700; margin-bottom: 6px; font-size: 10pt; color: #333; letter-spacing: -0.01em; }
        .meal-items { list-style: none; padding-left: 0; margin: 0 0 8px 0; }
        .meal-items li { font-size: 7pt; color: #666; line-height: 1.2; margin-bottom: 0px; font-weight: 400; }
        
        /* Text-only layout - 2 columns with proper pagination */
        .text-image-mix .days-grid { 
            grid-template-columns: repeat(2, 1fr) !important; 
            gap: 6px;
        }
        .text-image-mix .meal-section { 
            padding: 12px 16px; 
            display: flex;
            flex-direction: column;
        }
        .text-image-mix .meal-type-label { font-size: 8pt; margin-bottom: 4px; font-weight: 500; letter-spacing: 0.5px; }
        .text-image-mix .meal-title { font-size: 10pt; font-weight: 700; margin-bottom: 6px; color: #333; letter-spacing: -0.01em; }
        .text-image-mix .meal-items li { font-size: 8pt; line-height: 1.3; margin-bottom: 1px; font-weight: 400; }
        .text-image-mix .day-card { 
            min-height: auto; 
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .text-image-mix .meal-content { display: flex; align-items: flex-start; gap: 10px; flex: 1; }
        .text-image-mix .meal-image { 
            width: 60px; 
            height: 60px; 
            border-radius: 6px; 
            object-fit: cover; 
            flex-shrink: 0; 
        }
        
        /* Image-only layout - 3 columns grid for 5+ days */
        .image-only .days-grid { 
            grid-template-columns: repeat(3, 1fr) !important; 
            gap: 8px;
        }
        .image-only .day-card {
            min-height: auto;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .image-only .meal-section {
            padding: 16px;
            text-align: center;
        }
        .image-only .meal-image {
            width: 90px;
            height: 90px;
            border-radius: 8px;
            object-fit: cover;
            margin: 0 auto 8px;
        }
        .image-only .meal-title {
            font-size: 9pt;
            font-weight: 700;
            color: #333;
            letter-spacing: -0.01em;
        }
        
        /* Instructions */
        .instructions { 
            font-size: 7pt; 
            color: #666; 
            background: #fafafa; 
            border-radius: 4px; 
            padding: 5px 8px; 
            margin-top: 5px;
            border-left: 2px solid #ddd;
        }
        .instructions-label {
            font-size: 6pt;
            color: #999;
            text-transform: none;
            font-weight: 500;
            margin-bottom: 2px;
            display: block;
            letter-spacing: 0.3px;
        }
        
        /* Compact Footer - positioned for each page */
        .footer { 
            position: fixed; 
            bottom: 5mm; 
            left: 10mm; 
            right: 10mm; 
            border-top: 1px solid #ddd; 
            padding-top: 3mm; 
            font-size: 6pt;
            height: 25mm;
            background: white;
            z-index: 1000;
        }
        .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }
        .footer-left {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .footer-contact {
            font-size: 9pt;
            line-height: 1.4;
        }
        .footer-contact .email {
            background: #e8f4f8;
            color: #2c5282;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9pt;
            display: inline-block;
            font-weight: 500;
        }
        .footer-contact .phone {
            background: #e8f4f8;
            color: #2c5282;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9pt;
            display: inline-block;
            font-weight: 500;
        }
        .footer-logos {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-direction: row;
        }
        .footer-logo-bistro {
            height: 30px;
        }
        .footer-logo-komfi {
            height: 12px;
        }
        .footer-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            font-size: 6pt;
            color: #666;
        }
        .footer-box {
            padding: 6px 8px;
            background: #f8f8f8;
            border-radius: 3px;
            border-left: 2px solid #ccc;
        }
        .footer-box h4 {
            margin: 0 0 2px 0;
            font-size: 6pt;
            color: #666;
            font-weight: 700;
        }
        .footer-box p {
            margin: 0;
            line-height: 1.1;
            color: #666;
            font-weight: 400;
        }
        
        @media print { 
            .page { margin: 0; }
            .day-card { 
                page-break-inside: avoid;
                break-inside: avoid;
            }
            .footer { position: fixed; bottom: 5mm; }
            .header { position: fixed; top: 8mm; }
            /* Apply margin-top for multi-page layouts */
            .days-grid-2 .day-card:nth-child(n+5) {
                margin-top: 35mm;
            }
            /* For 7-day templates, disable all margin-top to keep everything on one page */
            .seven-day .days-grid-2 .day-card:nth-child(n+5) {
                margin-top: 0;
            }
            /* Constrain content to single page for short layouts only */
            .page.single-page-only .content {
                max-height: calc(297mm - 70mm);
                overflow: hidden;
            }
            /* Allow multi-page flow for text-image-mix layouts */
            .text-image-mix .content {
                margin-bottom: 35mm;
                max-height: none;
                overflow: visible;
            }
            /* Text-only pagination - force page breaks and margins */
            .text-image-mix .days-grid .day-card:nth-child(3),
            .text-image-mix .days-grid .day-card:nth-child(5),
            .text-image-mix .days-grid .day-card:nth-child(7) {
                page-break-before: always;
                margin-top: 35mm;
            }
            /* Add margin-top for even cards on new pages */
            .text-image-mix .days-grid .day-card:nth-child(4),
            .text-image-mix .days-grid .day-card:nth-child(6) {
                margin-top: 35mm;
            }
            /* Image-only pagination - 6 cards per page for 7-day */
            .image-only .days-grid .day-card:nth-child(7) {
                page-break-before: always;
                margin-top: 35mm;
            }
        }
    </style>
</head>
<body>
    <div class="page {{#isLayoutType layoutType 'text-image-mix'}}text-image-mix{{/isLayoutType}}{{#isLayoutType layoutType 'image-only'}}image-only{{/isLayoutType}}{{#if (eq daysCount 7)}} seven-day{{/if}}">
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
            <div class="days-grid days-grid-2">
                {{#each days}}
                <div class="day-card" style="--meal-count: 1">
                    <div class="day-header">{{{../calendarIcon}}}DEN {{this.den}}</div>
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
                <div class="day-card" style="--meal-count: {{this.meals.length}}">
                    <div class="day-header">{{{../calendarIcon}}}DEN {{this.den}}</div>
                    <div class="day-card-content">
                    {{#each this.meals}}
                    <div class="meal-section">
                        <div class="meal-type-label">{{#if this.iconSvg}}<span class="meal-type-icon">{{{this.iconSvg}}}</span>{{/if}}{{this.typeLabel}}</div>
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
                                <div class="instructions">
                                    <span class="instructions-label">Příprava</span>
                                    {{this.instructions}}
                                </div>
                                {{/if}}
                            </div>
                        </div>
                        {{/if}}
                    </div>
                    {{/each}}
                    </div>
                </div>
                {{/each}}
            </div>
            {{/isLayoutType}}
            
            {{#isLayoutType layoutType 'text-image-mix'}}
            <!-- Text-only layout - max 2 columns -->
            <div class="days-grid days-grid-2">
                {{#each days}}
                <div class="day-card" style="--meal-count: {{this.meals.length}}">
                    <div class="day-header">{{{../calendarIcon}}}DEN {{this.den}}</div>
                    <div class="day-card-content">
                    {{#each this.meals}}
                    <div class="meal-section">
                        <div class="meal-type-label">{{#if this.iconSvg}}<span class="meal-type-icon">{{{this.iconSvg}}}</span>{{/if}}{{this.typeLabel}}</div>
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
                                <div class="instructions">
                                    <span class="instructions-label">Příprava</span>
                                    {{this.instructions}}
                                </div>
                                {{/if}}
                            </div>
                        </div>
                        {{/if}}
                    </div>
                    {{/each}}
                    </div>
                </div>
                {{/each}}
            </div>
            {{/isLayoutType}}
            
            {{#isLayoutType layoutType 'image-only'}}
            <!-- Image-only layout - 3 columns for 5+ days -->
            <div class="days-grid days-grid-3">
                {{#each days}}
                <div class="day-card" style="--meal-count: 1">
                    <div class="day-header">{{{../calendarIcon}}}DEN {{this.den}}</div>
                    <div class="day-card-content">
                    {{#with this.meals.[0]}}
                    <div class="meal-section">
                        {{#if this.image}}
                        <img src="{{this.image}}" alt="{{this.title}}" class="meal-image">
                        {{/if}}
                        <div class="meal-title">{{this.title}}</div>
                    </div>
                    {{/with}}
                    </div>
                </div>
                {{/each}}
            </div>
            {{/isLayoutType}}
        </div>
        
        <div class="footer">
            <div class="footer-content">
                <div class="footer-left">
                    <div class="footer-contact">
                        <div class="phone">{{telefon}}</div>
                        <div class="email">{{email}}</div>
                    </div>
                </div>
                <div class="footer-logos">
                    <img src="https://raw.githubusercontent.com/komfi-health/meal-plans/main/img/logos/logo-bistro.svg" alt="bistro" class="footer-logo-bistro">
                    <img src="https://raw.githubusercontent.com/komfi-health/meal-plans/main/img/logos/logo-komfi.svg" alt="komfi" class="footer-logo-komfi">
                </div>
            </div>
            <div class="footer-info">
                <div class="footer-box">
                    <h4>ZMĚNY</h4>
                    <p>Rádi byste změnili objednávku nebo vyřadili konkrétní jídlo? Ozvěte se nám do <strong>pondělí 9:00</strong>, abyste stihli změnu ještě v daném týdnu.</p>
                </div>
                <div class="footer-box">
                    <h4>PRVNÍ OBJEDNÁVKA NA DOBÍRKU</h4>
                    <p>Dostali jste první objednávku na dobírku a chutnalo Vám? Ozvěte se nám do <strong>pondělí 9:00</strong> pomocí chatu na webu, emailem nebo případně telefonicky. Objednávka se automaticky neobnovuje.</p>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Synchronize heights of meal sections within the same page only
        function synchronizeMealSectionHeights() {
            const grid = document.querySelector('.days-grid');
            if (!grid) return;
            
            const dayCards = Array.from(grid.querySelectorAll('.day-card'));
            if (dayCards.length === 0) return;
            
            // Skip synchronization for text-image-mix layouts to prevent large gaps
            const isTextImageMix = document.querySelector('.page.text-image-mix');
            if (isTextImageMix) {
                // For text-image-mix layouts, group cards by page (2 cards per page)
                const cardsPerPage = 2;
                for (let pageStart = 0; pageStart < dayCards.length; pageStart += cardsPerPage) {
                    const pageCards = dayCards.slice(pageStart, pageStart + cardsPerPage);
                    synchronizeCardGroupHeights(pageCards);
                }
                return;
            }
            
            // Skip synchronization for image-only layouts
            const isImageOnly = document.querySelector('.page.image-only');
            if (isImageOnly) {
                return;
            }
            
            // For standard layouts, group by visual rows (2 cards per row)
            const cardsPerRow = 2;
            for (let rowStart = 0; rowStart < dayCards.length; rowStart += cardsPerRow) {
                const rowCards = dayCards.slice(rowStart, rowStart + cardsPerRow);
                synchronizeCardGroupHeights(rowCards);
            }
        }
        
        function synchronizeCardGroupHeights(cardGroup) {
            if (cardGroup.length <= 1) return;
            
            // Get max number of meal sections in this group
            const maxMealSections = Math.max(...cardGroup.map(card => 
                card.querySelectorAll('.meal-section').length
            ));
            
            // For each meal section position (0, 1, 2...), synchronize heights within this group only
            for (let i = 0; i < maxMealSections; i++) {
                const sectionsAtPosition = cardGroup.map(card => {
                    const sections = card.querySelectorAll('.meal-section');
                    return sections[i] || null;
                }).filter(section => section !== null);
                
                if (sectionsAtPosition.length > 1) {
                    // Reset heights first
                    sectionsAtPosition.forEach(section => {
                        section.style.height = 'auto';
                    });
                    
                    // Get the maximum height
                    const maxHeight = Math.max(...sectionsAtPosition.map(section => 
                        section.offsetHeight
                    ));
                    
                    // Apply max height to all sections at this position
                    sectionsAtPosition.forEach(section => {
                        section.style.height = maxHeight + 'px';
                        section.style.display = 'flex';
                        section.style.flexDirection = 'column';
                        section.style.justifyContent = 'flex-start';
                    });
                }
            }
        }
        
        // Run after DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            // Add single-page-only class for 4-day non-text-image-mix layouts only
            const page = document.querySelector('.page');
            const dayCards = document.querySelectorAll('.day-card');
            if (page && !page.classList.contains('text-image-mix') && dayCards.length === 4) {
                page.classList.add('single-page-only');
            }
            
            synchronizeMealSectionHeights();
        });
        
        // Also run after a short delay to ensure all content is rendered
        setTimeout(synchronizeMealSectionHeights, 100);
    </script>
</body>
</html>`;

async function fetchData(idCircuit) {
    const records = await base(tableId)
        .select({
            filterByFormula: `{ID Circuit} = '${idCircuit}'`,
            sort: [{ field: 'Den', direction: 'asc' }]
        })
        .all();
        
    return records.map(record => record.fields);
}

function determineLayoutType(templateType, daysCount) {
    const match = templateType.match(/(\d+)x([A-Z0-9\-]+)/);
    if (!match) return 'standard';
    
    const mealTypes = match[2].split('-');
    
    
    // Text-image-mix: 4+ meal types OR 7+ days (except single meal type)
    if (mealTypes.length >= 4 || (daysCount >= 7 && mealTypes.length > 1)) {
        return 'text-image-mix';
    }
    
    // Image-only: only one meal type with 5+ days
    if (mealTypes.length === 1 && daysCount >= 5) {
        return 'image-only';
    }
    
    // Big cards: only one meal type with less than 5 days
    if (mealTypes.length === 1) {
        return 'big-cards';
    }
    
    return 'standard';
}

async function transformDataForTemplate(menuData) {
    const dayGroups = {};
    
    const templateType = menuData[0]?.['Template'] || '5x-O';
    const match = templateType.match(/(\d+)x([A-Z0-9\-]+)/);
    const daysCount = match ? parseInt(match[1], 10) : 5;
    const mealTypeString = match ? match[2] : 'O';
    
    const mealTypeOrder = ['S', 'SV1', 'O', 'SV2', 'V'];
    const requestedMealTypes = mealTypeString.split('-');
    const activeMealTypes = mealTypeOrder.filter(mt => requestedMealTypes.includes(mt));
    
    const layoutType = determineLayoutType(templateType, daysCount);
    console.log(`Layout type: ${layoutType} for template ${templateType}`);
    
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
            dayGroups[day] = { den: day, meals: [] };
        }
        
        // Determine meal type from 'Typ Barva'
        let mealType = null;
        if (item['Typ Barva']) {
            const typBarva = item['Typ Barva'];
            if (typBarva.includes('Oběd')) mealType = 'O';
            else if (typBarva.includes('Odp. svačina')) mealType = 'SV2';
            else if (typBarva.includes('Dop. svačina')) mealType = 'SV1';
            else if (typBarva.includes('Snídaně')) mealType = 'S';
            else if (typBarva.includes('Večeře')) mealType = 'V';
        }
        
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
        
        // Add item to meal - avoid duplicating meal title in items
        if (item['Položka']) {
            const isMainMeal = ['O', 'V'].includes(mealType);
            const itemName = item['Položka'].replace(/["""]/g, '');
            const mealName = (item['Název jídla'] || '').replace(/["""]/g, '');
            
            // For main meals, only add item if it's different from title
            // For soups in dinner, always add them even if they match the title
            const isSoupInDinner = mealType === 'V' && itemName.toLowerCase().includes('polévka');
            
            if (!isMainMeal || itemName !== mealName || isSoupInDinner) {
                meal.items.push({
                    nazev: item['Položka'],
                    pomer: item['Poměr'] || '1',
                    showPortion: !isMainMeal // Hide portions only for main meals
                });
            }
        }
        
        // Set meal title
        if (item['Název jídla'] && item['Název jídla'] !== 'undefined' && !meal.title) {
            meal.title = item['Název jídla'];
        }
        
        // Set image for all layouts
        if (!meal.image) {
            if (item['@image'] && item['@image'] !== 'img/meals/.png') {
                const imagePath = item['@image'];
                if (imagePath.includes('/')) {
                    // For paths like img/meals/015.png, replace with img/meals/jpeg/015.jpg
                    const jpegPath = imagePath.replace('img/meals/', 'img/meals/jpeg/').replace('.png', '.jpg');
                    meal.image = `https://raw.githubusercontent.com/komfi-health/meal-plans/main/${jpegPath}`;
                } else {
                    // For simple filenames like 015.png, use jpeg folder
                    meal.image = `https://raw.githubusercontent.com/komfi-health/meal-plans/main/img/meals/jpeg/${imagePath.replace('.png', '.jpg')}`;
                }
            } else {
                meal.image = `https://raw.githubusercontent.com/komfi-health/meal-plans/main/img/meals/placeholders/${mealType}.svg`;
            }
        }
        
        // Set instructions
        if (item['Instrukce'] && !meal.instructions) {
            meal.instructions = item['Instrukce'];
        }
    });
    
    // Sort meals within each day
    Object.values(dayGroups).forEach(day => {
        day.meals.sort((a, b) => {
            const orderA = mealTypeOrder.indexOf(a.type);
            const orderB = mealTypeOrder.indexOf(b.type);
            return orderA - orderB;
        });
    });
    
    const days = Object.values(dayGroups)
        .sort((a, b) => a.den - b.den)
        .slice(0, daysCount);
    
    // For big cards, keep only the main meal
    if (layoutType === 'big-cards') {
        days.forEach(day => {
            const mainMeal = day.meals.find(m => m.type === activeMealTypes[0]);
            day.meals = mainMeal ? [mainMeal] : [];
        });
    }
    
    const firstRecord = menuData[0] || {};
    
    // Load SVG icons for meal types
    const mealTypeIcons = {};
    for (const mealType of activeMealTypes) {
        const svgIcon = await loadSvgIcon(mealType);
        if (svgIcon) {
            mealTypeIcons[mealType] = svgIcon;
        }
    }
    
    // Add icons to meals
    days.forEach(day => {
        day.meals.forEach(meal => {
            if (mealTypeIcons[meal.type]) {
                meal.iconSvg = mealTypeIcons[meal.type];
            }
        });
    });
    
    return {
        klient: firstRecord['Klient'] || 'Klient',
        idCircuit: firstRecord['ID Circuit'] || '',
        datumDonaska: firstRecord['Datum rozvozu'] || '',
        telefon: '734 602 600',
        email: 'zakaznici@budtekomfi.cz',
        days: days,
        daysCount: daysCount,
        templateType: templateType,
        layoutType: layoutType,
        calendarIcon: calendarIconSvg
    };
}

async function generatePDF(idCircuit) {
    try {
        console.log(`Fetching data for ${idCircuit}...`);
        const menuData = await fetchData(idCircuit);
        console.log(`Found ${menuData.length} records`);
        
        if (menuData.length === 0) {
            throw new Error(`No data found for ID Circuit: ${idCircuit}`);
        }
        
        const templateData = await transformDataForTemplate(menuData);
        console.log(`Layout type: ${templateData.layoutType} for template ${templateData.templateType}`);
        console.log(`Template: ${templateData.templateType}`);
        console.log(`Days: ${templateData.daysCount}`);
        
        const template = handlebars.compile(htmlTemplate);
        const html = template(templateData);
        
        const debugFile = `local-preview/html/${idCircuit}-improved-debug.html`;
        await fs.writeFile(debugFile, html);
        console.log(`Debug HTML saved to ${debugFile}`);
        
        console.log('Launching Puppeteer...');
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            preferCSSPageSize: true
        });
        
        await browser.close();
        
        const klientName = templateData.klient.replace(/[^a-zA-Z0-9\u00C0-\u017F\s]/g, '').replace(/\s+/g, ' ').trim();
        const filename = `local-preview/pdf/${idCircuit}-${klientName}.pdf`;
        await fs.writeFile(filename, pdf);
        console.log(`PDF saved as ${filename}`);
        
        return filename;
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
}

// Run with command line argument
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