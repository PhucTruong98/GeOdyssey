// build-countries.ts (Node.js script)
import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('scripts/countries.json', 'utf-8'));
const countryData = raw.features.map((f: any) => ({
  code: f.properties.ISO_A2,
  name: f.properties.NAME,
  continent: f.properties.CONTINENT,
  economy: f.properties.ECONOMY,
  population: f.properties.POP_EST,
  capital: "", // optional, you can merge in more data here
}));

fs.writeFileSync('./src/assets/data/countries2.json', JSON.stringify(countryData, null, 2));
