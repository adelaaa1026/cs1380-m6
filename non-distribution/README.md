# M0: Setup & Centralized Computing
* name: `Adela Zhou`
* email: `bingbin_zhou@brown.edu`
* cslogin: `bzhou29`

## Summary
> Summarize your implementation, including the most challenging aspects;
remember to update the `report` section of the `package.json` file with the
total number of hours it took you to complete M0 (`hours`), the total number
of JavaScript lines you added, including tests (`jsloc`), the total number of
shell lines you added, including for deployment and testing (`sloc`).

My implementation consists of two components (coding + testing) addressing T1--8.
The coding part is under /c, which includes five javascript programs and one
shell program that work together to index raw text content. I implemented 
additional testing that includes eight unit tests.
The most challenging aspect was merging indexes together because the 
local indexes and global indexes have different formats. I need to be 
extra careful when processing them. However, it feels very inefficient 
that the global indexes are parsed from a txt to a dictionary every time
new local indexes are added. 

## Correctness & Performance Characterization
> Describe how you characterized the correctness and performance of your
implementation.
To characterize correctness, we developed eight tests that test the
following cases: 1. getText and getURLs can extract complete text and
urls from raw html files, including edge cases like empty files and 
invalid urls. 2. process.sh and stem.js can process each word using 
the Porter stemming algorithm. 3. merge.js can merge local indexes with
global indexes, where the words are sorted in alphabetically order and 
urls are sorted by counts. I also tested edge cases when there is a tie.

*Performance*: The throughput of various subsystems is described in the
`"throughput"` portion of package.json. The characteristics of my development
machines are summarized in the `"dev"` portion of package.json.

## Wild Guess
> How many lines of code do you think it will take to build the fully
distributed, scalable version of your search engine? Add that number to the
`"dloc"` portion of package.json, and justify your answer below.