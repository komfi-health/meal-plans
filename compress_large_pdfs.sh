#!/bin/bash

echo "Compressing PDFs larger than 2MB with more aggressive settings..."
echo ""

TOTAL=0
SUCCESS=0
FAILED=0

# Find PDFs larger than 2MB
for pdf in pdf/*.pdf; do
    if [ -f "$pdf" ]; then
        SIZE=$(ls -l "$pdf" | awk '{print $5}')
        SIZE_MB=$(echo "scale=2; $SIZE / 1048576" | bc)
        
        # Only compress if larger than 2MB
        if (( $(echo "$SIZE_MB > 2.0" | bc -l) )); then
            ((TOTAL++))
            echo -n "Compressing $(basename "$pdf") (${SIZE_MB}MB)... "
            
            # Create temporary compressed version
            OUTPUT="${pdf%.pdf}_temp.pdf"
            
            # Use Ghostscript with moderate compression to preserve images
            gs -sDEVICE=pdfwrite \
               -dCompatibilityLevel=1.4 \
               -dNOPAUSE \
               -dQUIET \
               -dBATCH \
               -dDownsampleColorImages=true \
               -dColorImageDownsampleType=/Bicubic \
               -dColorImageResolution=150 \
               -dDownsampleGrayImages=true \
               -dGrayImageDownsampleType=/Bicubic \
               -dGrayImageResolution=150 \
               -dDownsampleMonoImages=true \
               -dMonoImageDownsampleType=/Bicubic \
               -dMonoImageResolution=150 \
               -dColorImageFilter=/DCTEncode \
               -dGrayImageFilter=/DCTEncode \
               -dJPEGQ=85 \
               -dCompressPages=true \
               -sOutputFile="$OUTPUT" \
               "$pdf" 2>/dev/null
            
            if [ $? -eq 0 ]; then
                # Get compressed size
                COMPRESSED_SIZE=$(ls -l "$OUTPUT" | awk '{print $5}')
                COMPRESSED_MB=$(echo "scale=2; $COMPRESSED_SIZE / 1048576" | bc)
                
                # Only replace if compression was significant and result is smaller
                if [ $COMPRESSED_SIZE -lt $SIZE ]; then
                    mv "$OUTPUT" "$pdf"
                    echo "✓ ${SIZE_MB}MB -> ${COMPRESSED_MB}MB"
                    ((SUCCESS++))
                else
                    rm "$OUTPUT"
                    echo "✗ Not smaller (${COMPRESSED_MB}MB)"
                    ((FAILED++))
                fi
            else
                echo "✗ Failed"
                ((FAILED++))
                [ -f "$OUTPUT" ] && rm "$OUTPUT"
            fi
        fi
    fi
done

echo ""
echo "=== COMPRESSION COMPLETE ===="
echo "Large PDFs processed: $TOTAL"
echo "Successfully compressed: $SUCCESS"
echo "Failed/not improved: $FAILED"

# Check final status
echo ""
echo "Final size check:"
LARGE_COUNT=$(find pdf/ -name "*.pdf" -size +1M | wc -l)
VERY_LARGE_COUNT=$(find pdf/ -name "*.pdf" -size +2M | wc -l)
echo "PDFs over 1MB: $LARGE_COUNT"  
echo "PDFs over 2MB: $VERY_LARGE_COUNT"