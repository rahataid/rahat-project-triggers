#!/bin/bash

# Better error handling function
handle_error() {
    local line_no=$1
    local error_code=$2
    echo "==============================================="
    echo "❌ ERROR: Script failed at line ${line_no} with exit code ${error_code}"
    echo "==============================================="
    return ${error_code}
}

# Trap errors with line numbers
trap 'handle_error ${LINENO} $?' ERR

# Enable command tracing to help with debugging
set -x

echo "=== Rahat Triggers Production Setup ==="
echo "Setting up production environment..."

# Root directory of the project
PROJECT_ROOT=$(dirname $(dirname $(realpath $0)))
SEED_DIR="$PROJECT_ROOT/prisma"

# Check if seed directory exists
if [ ! -d "$SEED_DIR" ]; then
    echo "Error: Prisma directory not found at $SEED_DIR"
    return 1
fi

echo "Running seed files from: $SEED_DIR"

# Find all seed files and run them - use a different approach to avoid issues
SEED_FILES=()
while IFS= read -r file; do
    SEED_FILES+=("$file")
done < <(find "$SEED_DIR" -name "*.js" -o -name "*.ts" | sort)

if [ ${#SEED_FILES[@]} -eq 0 ]; then
    echo "No seed files found."
    return 0
fi

# Count the seed files
TOTAL_FILES=${#SEED_FILES[@]}
echo "Found $TOTAL_FILES seed files to run."

COUNT=1
for file in "${SEED_FILES[@]}"; do
    echo "[$COUNT/$TOTAL_FILES] Running seed: $(basename "$file")"
    
    if [[ $file == *.ts ]]; then
        if ! ts-node "$file"; then
            echo "❌ Seed failed: $(basename "$file")"
            echo "Continuing with next seed..."
        else
            echo "✅ Seed completed successfully: $(basename "$file")"
        fi
    else
        if ! node "$file"; then
            echo "❌ Seed failed: $(basename "$file")"
            echo "Continuing with next seed..."
        else
            echo "✅ Seed completed successfully: $(basename "$file")"
        fi
    fi
    
    COUNT=$((COUNT+1))
done

set +x

echo "=== Production setup completed! ==="
