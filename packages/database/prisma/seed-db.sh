#!/bin/bash
# This script seeds the database with initial data for data sources and their configurations.

SEEDS_DIR="$(dirname "$0")/seeds"

if [ ! -d "$SEEDS_DIR" ]; then
  echo "Seeds directory not found: $SEEDS_DIR"
  exit 1
fi  

# Loop through all seed files and execute them
# Log how many seed files are being run
num_seed_files=$(ls "$SEEDS_DIR"/*.ts | wc -l)
echo -e "\033[34mRunning $num_seed_files seed files \033[0m"

for seed_file in "$SEEDS_DIR"/*.ts; do
  if [ -f "$seed_file" ]; then
    echo -e "\033[34mRunning seed file: $seed_file\033[0m"

    # Use ts-node to execute the TypeScript seed file
    npx tsx "$seed_file"
    if [ $? -ne 0 ]; then
      echo -e "\033[31mError running seed file: $seed_file\033[0m"
      echo "Error running seed file: $seed_file"
      exit 1
    fi
  else
    echo -e "\033[33mNo seed files found in directory: $SEEDS_DIR\033[0m"
  fi
done

echo -e "\033[32mDatabase seeding completed successfully.\033[0m"