#!/bin/bash

API_KEY="patBkFFXUTKxjfrH9.c4ae2004900da887054d1aa4f2dcc963b14556d5dce788fbe076df76073a6e83"
BASE_ID="appsLDyM9WHvamSmN"
TABLE_ID="tblCHxatBEyaspzR3"

# Create temporary file to store all templates
TEMP_FILE=$(mktemp)

# Function to fetch page
fetch_page() {
    local offset_param=""
    if [ ! -z "$1" ]; then
        offset_param="?offset=$1"
    fi
    
    curl -s -X GET "https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}${offset_param}" \
        -H "Authorization: Bearer ${API_KEY}" \
        -H "Content-Type: application/json"
}

# Fetch first page
echo "Fetching first page..."
response=$(fetch_page)
echo "$response" | jq -r '.records[] | select(.fields.Template) | "\(.fields.Template)|\(.fields["ID Circuit"])"' >> "$TEMP_FILE"

# Check if there's an offset for next page
offset=$(echo "$response" | jq -r '.offset // empty')

# Continue fetching until no more pages
while [ ! -z "$offset" ]; do
    echo "Fetching next page with offset: $offset"
    response=$(fetch_page "$offset")
    echo "$response" | jq -r '.records[] | select(.fields.Template) | "\(.fields.Template)|\(.fields["ID Circuit"])"' >> "$TEMP_FILE"
    offset=$(echo "$response" | jq -r '.offset // empty')
done

# Extract unique templates with one example ID Circuit each
echo ""
echo "=== ALL UNIQUE TEMPLATE TYPES WITH EXAMPLE ID CIRCUITS ==="
echo ""
sort "$TEMP_FILE" | awk -F'|' '!seen[$1]++ {print $1 " | " $2}' | sort

# Clean up
rm "$TEMP_FILE"

echo ""
echo "=== SUMMARY ==="
unique_count=$(sort "$TEMP_FILE" | awk -F'|' '!seen[$1]++' | wc -l)
echo "Total unique template types found: $unique_count"