#!/bin/bash

# Input file and output file
INPUT_FILE="./test_urls.txt"
OUTPUT_FILE="./temp_test_index.txt"

# Check if input file exists
if [[ ! -f "$INPUT_FILE" ]]; then
  echo "Error: Input file '$INPUT_FILE' not found."
  exit 1
fi

# Count the total number of lines (pages) in the input file
TOTAL_PAGES=$(wc -l < "$INPUT_FILE")

# Measure the time taken to process the file
START_TIME=$(date +%s)

# Run the indexing script
./index.sh "$INPUT_FILE" "$OUTPUT_FILE"

END_TIME=$(date +%s)

# Calculate total time and throughput
TOTAL_TIME=$((END_TIME - START_TIME))

if (( TOTAL_TIME > 0 )); then
  THROUGHPUT=$(awk "BEGIN {print $TOTAL_PAGES / $TOTAL_TIME}")
else
  THROUGHPUT="N/A (Too fast to measure)"
fi

# Display results
echo "Total Pages Processed: $TOTAL_PAGES"
echo "Total Time Taken: $TOTAL_TIME seconds"
echo "Throughput: $THROUGHPUT pages/second"
