#!/bin/bash

# Input file containing queries
query_file="student_queries.txt"

# Ensure the file exists
if [[ ! -f $query_file ]]; then
  echo "Query file $query_file does not exist!"
  exit 1
fi

# Start time
start_time=$(date +%s)

# Process each query in the file
while IFS= read -r query; do
  ./query.js $query > /dev/null
done < "$query_file"

# End time
end_time=$(date +%s)

# Calculate elapsed time and throughput
elapsed_time=$((end_time - start_time))
num_queries=$(wc -l < "$query_file")
throughput=$(awk "BEGIN {print $num_queries / $elapsed_time}")

echo "Processed $num_queries queries in $elapsed_time seconds."
echo "Throughput: $throughput queries/second."
