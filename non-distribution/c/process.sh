#!/bin/bash

# Convert input to a stream of non-stopword terms
# Usage: ./process.sh < input > output



# cat - | \

# Convert each line to one word per line, **remove non-letter characters**, 
tr -cs 'A-Za-z' '\n' |

# make lowercase, convert to ASCII; 
tr '[:upper:]' '[:lower:]' |
iconv -c -t ascii//TRANSLIT |

# then remove stopwords (inside d/stopwords.txt)
grep -vwFf d/stopwords.txt

