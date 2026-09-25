#!/bin/sh
# This script allows selecting and running a specific seed file

SEEDS_DIR="$(dirname "$0")/seeds"

if [ ! -d "$SEEDS_DIR" ]; then
  echo "Seeds directory not found: $SEEDS_DIR"
  exit 1
fi

# Get all seed files (POSIX compatible)
i=0
for seed_file in "$SEEDS_DIR"/*.ts; do
  if [ -f "$seed_file" ]; then
    i=$((i + 1))
    eval "seed_file_$i='$seed_file'"
  fi
done

if [ $i -eq 0 ]; then
  echo "\033[33mNo seed files found in: $SEEDS_DIR\033[0m"
  exit 1
fi

total_files=$i

# If a seed file is passed as an argument, use it directly
if [ -n "$1" ]; then
  seed_file="$SEEDS_DIR/$1"
  if [ ! -f "$seed_file" ]; then
    echo "\033[31mSeed file not found: $1\033[0m"
    echo "Available seed files:"
    j=1
    while [ $j -le $total_files ]; do
      eval "file=\$seed_file_$j"
      echo "  $(basename "$file")"
      j=$((j + 1))
    done
    exit 1
  fi
else
  # Display menu
  printf "\033[34m========================================\033[0m\n"
  printf "\033[34mAvailable Seed Files:\033[0m\n"
  printf "\033[34m========================================\033[0m\n"
  
  j=1
  while [ $j -le $total_files ]; do
    eval "file=\$seed_file_$j"
    printf "%d) %s\n" "$j" "$(basename "$file")"
    j=$((j + 1))
  done
  
  printf "\n"
  printf "Enter the number of the seed file to run (or 'q' to quit): "
  read choice
  
  if [ "$choice" = "q" ] || [ "$choice" = "Q" ]; then
    echo "Cancelled."
    exit 0
  fi
  
  # Validate input (check if it's a number and within range)
  case "$choice" in
    *[!0-9]*) 
      echo "\033[31mInvalid selection.\033[0m"
      exit 1
      ;;
    *)
      if [ "$choice" -lt 1 ] || [ "$choice" -gt $total_files ]; then
        echo "\033[31mInvalid selection.\033[0m"
        exit 1
      fi
      ;;
  esac
  
  eval "seed_file=\$seed_file_$choice"
fi

# Run the selected seed file
printf "\033[34mRunning seed file: %s\033[0m\n" "$(basename "$seed_file")"
npx tsx "$seed_file"

if [ $? -eq 0 ]; then
  echo "\033[32mSeed file executed successfully.\033[0m"
else
  printf "\033[31mError running seed file: %s\033[0m\n" "$(basename "$seed_file")"
  exit 1
fi
