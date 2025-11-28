// Quick script to parse CSV and understand structure
const fs = require('fs');

const csvContent = fs.readFileSync('Kompetenzen-Lehrplan.csv', 'utf-8');
const lines = csvContent.split('\n');

// Parse CSV properly (handle quoted fields with commas and newlines)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Combine multi-line entries
let rows = [];
let currentRow = '';
let inQuotes = false;

for (const line of lines) {
  for (const char of line) {
    if (char === '"') inQuotes = !inQuotes;
  }

  currentRow += (currentRow ? '\n' : '') + line;

  if (!inQuotes) {
    if (currentRow.trim()) {
      rows.push(currentRow);
    }
    currentRow = '';
  }
}

console.log('Total rows:', rows.length);

// Parse header
const headers = parseCSVLine(rows[0]);
console.log('\nHeaders:', headers.slice(0, 7));

// Find unique Kompetenzbereiche
const bereiche = new Set();
const zyklen = new Set();
const klassenstufen = new Set();

for (let i = 1; i < rows.length; i++) {
  const fields = parseCSVLine(rows[i]);
  if (fields[1]) bereiche.add(fields[1]);
  if (fields[4]) zyklen.add(fields[4]);
  if (fields[5]) klassenstufen.add(fields[5]);
}

console.log('\nKompetenzbereiche:', Array.from(bereiche).sort());
console.log('\nZyklen:', Array.from(zyklen).sort());
console.log('\nKlassenstufen:', Array.from(klassenstufen).sort());

// Show first 3 data rows
console.log('\n--- First 3 entries ---');
for (let i = 1; i <= 3; i++) {
  const fields = parseCSVLine(rows[i]);
  console.log(`\nRow ${i}:`);
  console.log('  LP Code:', fields[0]);
  console.log('  Bereich:', fields[1]);
  console.log('  Kompetenz:', fields[2]?.substring(0, 80) + '...');
  console.log('  Stufe:', fields[3]?.substring(0, 80) + '...');
  console.log('  Zyklus:', fields[4]);
  console.log('  Klasse:', fields[5]);
  console.log('  Grundanspruch:', fields[6]);
}
