#!/bin/bash

# File containing the URLs to test
URL_FILE="test_urls.txt"

# Count the total number of URLs
TOTAL_URLS=$(wc -l < "$URL_FILE")

# Measure the time taken to run the crawler on all URLs
START_TIME=$(date +%s)

# Run the crawler for each URL in the file
while read -r URL; do
  ./crawl.sh "$URL"
done < "$URL_FILE"

END_TIME=$(date +%s)

# Calculate the total time and throughput
TOTAL_TIME=$((END_TIME - START_TIME))
# THROUGHPUT=$(echo "scale=2; $TOTAL_URLS / $TOTAL_TIME" | bc)
THROUGHPUT=$(awk "BEGIN {print $TOTAL_URLS / $TOTAL_TIME}")


echo "Total URLs: $TOTAL_URLS"
echo "Total Time: $TOTAL_TIME seconds"
echo "Throughput: $THROUGHPUT pages/second"
