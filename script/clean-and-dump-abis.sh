#!/bin/bash

# Script to extract ABIs from Foundry output files
# Creates ./abis/ directory with only the ABI section from each contract

set -e

# Get the project root directory (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

OUT_DIR="$PROJECT_ROOT/out"
ABIS_DIR="$PROJECT_ROOT/abis"

# Check if out directory exists
if [ ! -d "$OUT_DIR" ]; then
    echo "Error: $OUT_DIR directory not found"
    exit 1
fi

# Create abis directory (remove if exists to start fresh)
rm -rf "$ABIS_DIR"
mkdir -p "$ABIS_DIR"

echo "Extracting ABIs from $OUT_DIR to $ABIS_DIR..."

# Find all JSON files in out directory and extract ABIs
find "$OUT_DIR" -name "*.json" -type f | while read -r json_file; do
    # Skip build-info files
    if [[ "$json_file" == *"build-info"* ]]; then
        continue
    fi

    # Get the filename (e.g., "Matching.json")
    filename=$(basename "$json_file")

    # Skip if file already exists (avoid duplicates)
    if [ -f "$ABIS_DIR/$filename" ]; then
        continue
    fi

    # Extract ABI using jq if available, otherwise use python
    if command -v jq &> /dev/null; then
        jq '.abi' "$json_file" > "$ABIS_DIR/$filename" 2>/dev/null || {
            echo "Warning: Could not extract ABI from $json_file"
            continue
        }
    else
        python3 -c "
import json
import sys
try:
    with open('$json_file', 'r') as f:
        data = json.load(f)
    if 'abi' in data:
        print(json.dumps(data['abi'], indent=2))
    else:
        sys.exit(1)
except:
    sys.exit(1)
" > "$ABIS_DIR/$filename" 2>/dev/null || {
            echo "Warning: Could not extract ABI from $json_file"
            continue
        }
    fi

    echo "Extracted: $filename"
done

echo ""
echo "Done! ABIs saved to $ABIS_DIR"

