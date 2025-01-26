#!/bin/bash
# This is a student test


T_FOLDER=${T_FOLDER:-t}
R_FOLDER=${R_FOLDER:-}

cd "$(dirname "$0")/../..$R_FOLDER" || exit 1

DIFF=${DIFF:-diff}

term="word1"

cat "$T_FOLDER"/d/student_global_index.txt > "$T_FOLDER"/d/temp_student_global_index.txt


if $DIFF <(./query.js "$term") <(cat "$T_FOLDER"/d/query_out.txt) >&2;
then
    echo "$0 success: search results are identical"
    exit 0
else
    echo "$0 failure: search results are not identical"
    exit 1
fi

