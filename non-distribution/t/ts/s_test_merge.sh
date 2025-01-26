#!/bin/bash
# This is a student test


T_FOLDER=${T_FOLDER:-t}
R_FOLDER=${R_FOLDER:-}

cd "$(dirname "$0")/../..$R_FOLDER" || exit 1

DIFF=${DIFF:-diff}
DIFF_PERCENT=${DIFF_PERCENT:-0}

cat /dev/null > t/d/merge_output_holder.txt

files=("$T_FOLDER"/d/student_m{1..3}.txt)

for file in "${files[@]}"
do
    cat "$file" | c/merge.js t/d/merge_output_holder.txt > d/temp-global-index.txt
    echo "Contents of d/temp-global-index.txt:"
    cat d/temp-global-index.txt
    mv d/temp-global-index.txt t/d/merge_output_holder.txt
done


if DIFF_PERCENT=$DIFF_PERCENT t/gi-diff.js <(sort t/d/merge_output_holder.txt) <(sort "$T_FOLDER"/d/student_global_index.txt) >&2;
then
    echo "$0 success: global indexes are identical"
    exit 0
else
    echo "$0 failure: global indexes are not identical"
    exit 1
fi

