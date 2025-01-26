#!/usr/bin/env node

/*
Convert each term to its stem
Usage: ./stem.js <input >output
*/

const readline = require('readline');
const natural = require('natural');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

const stemmer = natural.PorterStemmer;

rl.on('line', function(line) {
  // Print the Porter stem from `natural` for each element of the stream.
  const words = line.split(/\s+/);
  const processedWords = words.map((word) => stemmer.stem(word));
  console.log(processedWords.join(' '));
});


// rl.close(); // Close the interface
// rl.on('close', () => {
//     console.log('Interface closed programmatically.');
// });
