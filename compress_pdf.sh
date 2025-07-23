#!/bin/bash

# Check if input file is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <input_pdf>"
    exit 1
fi

INPUT_PDF="$1"
OUTPUT_PDF="${INPUT_PDF%.pdf}_compressed.pdf"

# Use ghostscript to compress PDF - the working settings from before
gs -sDEVICE=pdfwrite \
   -dCompatibilityLevel=1.4 \
   -dNOPAUSE \
   -dQUIET \
   -dBATCH \
   -dDownsampleColorImages=false \
   -dDownsampleGrayImages=false \
   -dDownsampleMonoImages=false \
   -dAutoFilterColorImages=false \
   -dColorImageFilter=/DCTEncode \
   -dJPEGQ=95 \
   -dCompressPages=true \
   -sOutputFile="$OUTPUT_PDF" \
   "$INPUT_PDF"

# Check if compression was successful
if [ $? -eq 0 ]; then
    # Get file sizes
    ORIGINAL_SIZE=$(ls -l "$INPUT_PDF" | awk '{print $5}')
    COMPRESSED_SIZE=$(ls -l "$OUTPUT_PDF" | awk '{print $5}')
    
    # Convert to MB
    ORIGINAL_MB=$(echo "scale=2; $ORIGINAL_SIZE / 1048576" | bc)
    COMPRESSED_MB=$(echo "scale=2; $COMPRESSED_SIZE / 1048576" | bc)
    
    echo "Original: ${ORIGINAL_MB}MB -> Compressed: ${COMPRESSED_MB}MB"
    
    # Replace original with compressed if smaller
    if [ $COMPRESSED_SIZE -lt $ORIGINAL_SIZE ]; then
        mv "$OUTPUT_PDF" "$INPUT_PDF"
        echo "Replaced original with compressed version"
    else
        rm "$OUTPUT_PDF"
        echo "Compressed version not smaller, kept original"
    fi
else
    echo "Compression failed"
    exit 1
fi