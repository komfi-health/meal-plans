#!/bin/bash

echo "Starting compression of all PDFs in pdf/ directory..."
echo ""

TOTAL=0
SUCCESS=0
FAILED=0

# Find all PDF files in pdf directory
for pdf in pdf/*.pdf; do
    if [ -f "$pdf" ]; then
        ((TOTAL++))
        echo -n "Compressing $(basename "$pdf")... "
        
        # Compress the PDF
        OUTPUT="${pdf%.pdf}_compressed.pdf"
        
        gs -sDEVICE=pdfwrite \
           -dCompatibilityLevel=1.4 \
           -dNOPAUSE \
           -dQUIET \
           -dBATCH \
           -dDownsampleColorImages=false \
           -dDownsampleGrayImages=false \
           -dDownsampleMonoImages=false \
           -dAutoFilterColorImages=true \
           -dAutoFilterGrayImages=true \
           -dJPEGQ=75 \
           -dCompressPages=true \
           -dOptimize=true \
           -dPreserveEPSInfo=false \
           -dPreserveOPIComments=false \
           -dPreserveHalftoneInfo=false \
           -sOutputFile="$OUTPUT" \
           "$pdf" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            # Get file sizes
            ORIGINAL_SIZE=$(ls -l "$pdf" | awk '{print $5}')
            COMPRESSED_SIZE=$(ls -l "$OUTPUT" | awk '{print $5}')
            
            # Convert to MB
            ORIGINAL_MB=$(echo "scale=2; $ORIGINAL_SIZE / 1048576" | bc)
            COMPRESSED_MB=$(echo "scale=2; $COMPRESSED_SIZE / 1048576" | bc)
            
            # Replace original with compressed
            mv "$OUTPUT" "$pdf"
            echo "✓ ${ORIGINAL_MB}MB -> ${COMPRESSED_MB}MB"
            ((SUCCESS++))
        else
            echo "✗ Failed"
            ((FAILED++))
            [ -f "$OUTPUT" ] && rm "$OUTPUT"
        fi
    fi
done

echo ""
echo "=== COMPRESSION COMPLETE ==="
echo "Total PDFs: $TOTAL"
echo "Successfully compressed: $SUCCESS"
echo "Failed: $FAILED"

# Check final sizes
echo ""
echo "Checking PDFs larger than 1MB..."
LARGE_COUNT=$(find pdf/ -name "*.pdf" -size +1M | wc -l)
echo "PDFs still larger than 1MB: $LARGE_COUNT"

if [ $LARGE_COUNT -eq 0 ]; then
    echo "✅ All PDFs are now under 1MB!"
fi