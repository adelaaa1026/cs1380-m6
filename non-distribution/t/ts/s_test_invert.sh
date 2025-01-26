#!/bin/bash
# This is a student test

T_FOLDER=${T_FOLDER:-t}
R_FOLDER=${R_FOLDER:-}

cd "$(dirname "$0")/../..$R_FOLDER" || exit 1

DIFF=${DIFF:-diff}



url="https://test.html"


if $DIFF <(cat "$T_FOLDER"/d/combine_out.txt | c/invert.sh $url | sed 's/[[:space:]]//g' | sort) <(cat "$T_FOLDER"/d/invert_out.txt | sed 's/[[:space:]]//g' | sort) >&2;
then
    echo "$0 success: inverted indices are identical"
    exit 0
else
    echo "$0 failure: inverted indices are not identical"
    exit 1
fi
