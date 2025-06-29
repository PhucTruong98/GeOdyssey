#!/usr/bin/env node

/**
 * Fetches all countries from the REST Countries API,
 * extracts cca2 code and common name,
 * and writes to src/assets/data/countries.json.
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
async function generateCountries() {
  const res = await fetch('https://restcountries.com/v3.1/all?fields=cca2,name');
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('Unexpected API response');

  const cleaned = data
    .filter(c => c.cca2)
    .map(c => ({
      code: c.cca2.toUpperCase(),
      name: c.name.common
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const outDir = path.resolve(__dirname, '../src/assets/data');
  fs.mkdirSync(outDir, { recursive: true });

  const filePath = path.join(outDir, 'countries.json');
  fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2));
  console.log(`✅ Saved ${cleaned.length} countries to ${filePath}`);
}

generateCountries().catch(err => {
  console.error('❌ Error generating countries.json:', err);
  process.exit(1);
});
