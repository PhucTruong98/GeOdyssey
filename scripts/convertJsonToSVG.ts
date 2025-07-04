import fs from 'fs';
import { GeoJSON2SVG } from 'geojson2svg';

//use this file to convert geojson to svg with all the id attributes
(async () => {
  const geojson = JSON.parse(
fs.readFileSync(new URL('./countries-final.json', import.meta.url), 'utf-8')
);

  const converter = new GeoJSON2SVG({
    viewportSize: { width: 1000, height: 500 },
    mapExtentFromGeojson: true,
    output: 'svg',
    attributes: [
      { name: 'data-id', value: 'PLACEHOLDER' },
      { name: 'title', value: 'PLACEHOLDER' }
    ]
  });

  const svgPaths = converter.convert({
    type: 'FeatureCollection',
    features: geojson.features
  });

  const raw = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500">
  <g fill="#ccc" stroke="#333" stroke-width="0.5">
    ${svgPaths.join('\n')}
  </g>
</svg>
`;

  // Replace placeholders with real values from the GeoJSON features
  let index = 0;
  const fixed = raw.replace(/data-id="PLACEHOLDER" title="PLACEHOLDER"/g, () => {
    const feat = geojson.features[index++];
    return `id="${feat.properties.ISO_A2}" title="${feat.properties.NAME}"`;
  });

  fs.writeFileSync('./src/assets/maps/world-map-final5.svg', fixed, 'utf-8');
  console.log('✅ SVG map updated with correct id/title attributes!');
})();
