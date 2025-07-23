#!/bin/bash

echo "🔄 Konverze PNG obrázků na AVIF..."
echo ""

TOTAL=0
CONVERTED=0
FAILED=0
TOTAL_SIZE_PNG=0
TOTAL_SIZE_WEBP=0
TOTAL_SIZE_AVIF=0

# Vytvoření složky pro AVIF obrázky
mkdir -p img/meals/avif
mkdir -p img/meals/placeholders/avif

echo "📊 Porovnání velikostí PNG vs WebP vs AVIF:"
echo "============================================"

# Konverze hlavních obrázků jídel
for png in img/meals/*.png; do
    if [ -f "$png" ]; then
        ((TOTAL++))
        filename=$(basename "$png" .png)
        webp_file="img/meals/webp/${filename}.webp"
        avif_file="img/meals/avif/${filename}.avif"
        
        # Velikosti souborů
        size_png=$(ls -l "$png" | awk '{print $5}')
        size_png_kb=$((size_png / 1024))
        TOTAL_SIZE_PNG=$((TOTAL_SIZE_PNG + size_png))
        
        size_webp=$(ls -l "$webp_file" | awk '{print $5}')
        size_webp_kb=$((size_webp / 1024))
        TOTAL_SIZE_WEBP=$((TOTAL_SIZE_WEBP + size_webp))
        
        echo -n "${filename}: PNG(${size_png_kb}KB) → WebP(${size_webp_kb}KB) → "
        
        # Konverze na AVIF s kvalitou 60 (ekvivalent WebP 85)
        avifenc -s 10 -q 60 "$png" "$avif_file" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            size_avif=$(ls -l "$avif_file" | awk '{print $5}')
            size_avif_kb=$((size_avif / 1024))
            TOTAL_SIZE_AVIF=$((TOTAL_SIZE_AVIF + size_avif))
            
            # Výpočet úspor
            webp_savings=$(echo "scale=1; (($size_png - $size_webp) * 100) / $size_png" | bc)
            avif_savings=$(echo "scale=1; (($size_png - $size_avif) * 100) / $size_png" | bc)
            avif_vs_webp=$(echo "scale=1; (($size_webp - $size_avif) * 100) / $size_webp" | bc)
            
            echo "AVIF(${size_avif_kb}KB, -${avif_savings}% vs PNG, -${avif_vs_webp}% vs WebP)"
            ((CONVERTED++))
        else
            echo "❌ AVIF konverze selhala"
            ((FAILED++))
        fi
    fi
done

echo ""
echo "📊 Konverze placeholder obrázků:"
echo "==============================="

# Konverze placeholder obrázků
for png in img/meals/placeholders/*.png; do
    if [ -f "$png" ]; then
        ((TOTAL++))
        filename=$(basename "$png" .png)
        webp_file="img/meals/placeholders/webp/${filename}.webp"
        avif_file="img/meals/placeholders/avif/${filename}.avif"
        
        # Velikosti souborů
        size_png=$(ls -l "$png" | awk '{print $5}')
        size_png_kb=$((size_png / 1024))
        TOTAL_SIZE_PNG=$((TOTAL_SIZE_PNG + size_png))
        
        size_webp=$(ls -l "$webp_file" | awk '{print $5}')
        size_webp_kb=$((size_webp / 1024))
        TOTAL_SIZE_WEBP=$((TOTAL_SIZE_WEBP + size_webp))
        
        echo -n "${filename}: PNG(${size_png_kb}KB) → WebP(${size_webp_kb}KB) → "
        
        # Konverze na AVIF
        avifenc -s 10 -q 60 "$png" "$avif_file" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            size_avif=$(ls -l "$avif_file" | awk '{print $5}')
            size_avif_kb=$((size_avif / 1024))
            TOTAL_SIZE_AVIF=$((TOTAL_SIZE_AVIF + size_avif))
            
            # Výpočet úspor
            avif_savings=$(echo "scale=1; (($size_png - $size_avif) * 100) / $size_png" | bc)
            avif_vs_webp=$(echo "scale=1; (($size_webp - $size_avif) * 100) / $size_webp" | bc)
            
            echo "AVIF(${size_avif_kb}KB, -${avif_savings}% vs PNG, -${avif_vs_webp}% vs WebP)"
            ((CONVERTED++))
        else
            echo "❌ AVIF konverze selhala"
            ((FAILED++))
        fi
    fi
done

echo ""
echo "📊 CELKOVÉ POROVNÁNÍ FORMÁTŮ:"
echo "============================="

# Výpočet celkových velikostí
total_png_mb=$(echo "scale=2; $TOTAL_SIZE_PNG / 1048576" | bc)
total_webp_mb=$(echo "scale=2; $TOTAL_SIZE_WEBP / 1048576" | bc)
total_avif_mb=$(echo "scale=2; $TOTAL_SIZE_AVIF / 1048576" | bc)

webp_savings_total=$(echo "scale=1; (($TOTAL_SIZE_PNG - $TOTAL_SIZE_WEBP) * 100) / $TOTAL_SIZE_PNG" | bc)
avif_savings_total=$(echo "scale=1; (($TOTAL_SIZE_PNG - $TOTAL_SIZE_AVIF) * 100) / $TOTAL_SIZE_PNG" | bc)
avif_vs_webp_total=$(echo "scale=1; (($TOTAL_SIZE_WEBP - $TOTAL_SIZE_AVIF) * 100) / $TOTAL_SIZE_WEBP" | bc)

echo "🔸 PNG:   ${total_png_mb}MB (originál)"
echo "🔸 WebP:  ${total_webp_mb}MB (-${webp_savings_total}% vs PNG)"
echo "🔸 AVIF:  ${total_avif_mb}MB (-${avif_savings_total}% vs PNG, -${avif_vs_webp_total}% vs WebP)"

echo ""
echo "📊 SOUHRN:"
echo "=========="
echo "Celkem obrázků: $TOTAL"
echo "AVIF úspěšně vytvořeno: $CONVERTED"
echo "AVIF chyby: $FAILED"

if [ $CONVERTED -eq $TOTAL ]; then
    echo "✅ Všechny AVIF obrázky byly úspěšně vytvořeny!"
    
    # Doporučení formátu
    if (( $(echo "$avif_vs_webp_total > 10" | bc -l) )); then
        echo "🏆 DOPORUČENÍ: AVIF je výrazně menší než WebP (>10% úspora)"
    elif (( $(echo "$avif_vs_webp_total > 5" | bc -l) )); then
        echo "📊 DOPORUČENÍ: AVIF je mírně menší než WebP (${avif_vs_webp_total}% úspora)"
    else
        echo "⚖️  DOPORUČENÍ: WebP a AVIF jsou podobně veliké, WebP má lepší kompatibilitu"
    fi
else
    echo "⚠️  Některé AVIF obrázky se nepodařilo vytvořit."
fi