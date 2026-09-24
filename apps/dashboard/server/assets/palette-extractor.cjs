'use strict';

const zlib = require('zlib');
const { DashboardError } = require('../lib/errors.cjs');

function paeth(left, above, upperLeft) {
  const prediction = left + above - upperLeft; const leftDistance = Math.abs(prediction - left); const aboveDistance = Math.abs(prediction - above); const upperLeftDistance = Math.abs(prediction - upperLeft);
  return leftDistance <= aboveDistance && leftDistance <= upperLeftDistance ? left : aboveDistance <= upperLeftDistance ? above : upperLeft;
}
function decodePng(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buffer.subarray(0, 8).equals(signature)) throw new DashboardError('palette_source_unsupported', 'Palette extraction supports PNG logo files only in this release.', 422);
  let offset = 8; let width; let height; let bitDepth; let colorType; let interlace; const data = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset); const type = buffer.subarray(offset + 4, offset + 8).toString('ascii'); const value = buffer.subarray(offset + 8, offset + 8 + length); offset += length + 12;
    if (type === 'IHDR') { width = value.readUInt32BE(0); height = value.readUInt32BE(4); bitDepth = value[8]; colorType = value[9]; interlace = value[12]; }
    if (type === 'IDAT') data.push(value); if (type === 'IEND') break;
  }
  if (!width || !height || bitDepth !== 8 || ![2, 6].includes(colorType) || interlace !== 0) throw new DashboardError('palette_source_unsupported', 'This PNG logo encoding is not supported for local palette extraction.', 422);
  const channels = colorType === 6 ? 4 : 3; const stride = width * channels; const source = zlib.inflateSync(Buffer.concat(data)); const pixels = [];
  let position = 0; let previous = Buffer.alloc(stride);
  for (let row = 0; row < height; row += 1) {
    const filter = source[position++]; const current = Buffer.from(source.subarray(position, position + stride)); position += stride;
    for (let index = 0; index < stride; index += 1) {
      const left = index >= channels ? current[index - channels] : 0; const above = previous[index]; const upperLeft = index >= channels ? previous[index - channels] : 0;
      if (filter === 1) current[index] = (current[index] + left) & 0xff;
      else if (filter === 2) current[index] = (current[index] + above) & 0xff;
      else if (filter === 3) current[index] = (current[index] + Math.floor((left + above) / 2)) & 0xff;
      else if (filter === 4) current[index] = (current[index] + paeth(left, above, upperLeft)) & 0xff;
      else if (filter !== 0) throw new DashboardError('palette_source_unsupported', 'This PNG filter is not supported.', 422);
    }
    for (let column = 0; column < width; column += 1) { const pixel = column * channels; if (channels === 3 || current[pixel + 3] >= 96) pixels.push([current[pixel], current[pixel + 1], current[pixel + 2]]); }
    previous = current;
  }
  return pixels;
}
function toHex(red, green, blue) { return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`; }
function extractPalette(buffer) {
  const pixels = decodePng(buffer); const counts = new Map();
  for (const [red, green, blue] of pixels) {
    const key = `${Math.round(red / 16) * 16},${Math.round(green / 16) * 16},${Math.round(blue / 16) * 16}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const total = pixels.length || 1;
  return [...counts.entries()].map(([key, count]) => ({ hex: toHex(...key.split(',').map(Number)), prominence: Number((count / total).toFixed(4)) })).sort((left, right) => right.prominence - left.prominence || left.hex.localeCompare(right.hex)).slice(0, 6);
}

module.exports = { extractPalette };
