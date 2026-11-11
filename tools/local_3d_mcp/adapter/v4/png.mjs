import {inflateSync, deflateSync} from 'node:zlib';
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = Array.from({length: 256}, (_, n) => {
  let c = n; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = bytes => {
  let c = 0xffffffff; for (const byte of bytes) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const paeth = (a, b, c) => {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** Bounded 8-bit non-interlaced RGB/RGBA PNG decoder for Chromium stills. */
export function decodePng(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.subarray(0, 8).equals(signature)) throw Error('Invalid PNG signature');
  let width, height, channels, ended = false; const compressed = [];
  for (let offset = 8; offset < buffer.length;) {
    if (offset + 12 > buffer.length) throw Error('Truncated PNG chunk');
    const length = buffer.readUInt32BE(offset), type = buffer.toString('ascii', offset + 4, offset + 8);
    if (offset + length + 12 > buffer.length) throw Error('PNG chunk exceeds file');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (crc32(buffer.subarray(offset + 4, offset + 8 + length)) !== buffer.readUInt32BE(offset + 8 + length)) throw Error('PNG CRC mismatch');
    if (type === 'IHDR') {
      if (width !== undefined || length !== 13) throw Error('Invalid PNG IHDR');
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      if (!width || !height || width * height > 10_000_000 || data[8] !== 8 || ![2, 6].includes(data[9]) || data[10] || data[11] || data[12]) throw Error('Unsupported PNG format');
      channels = data[9] === 6 ? 4 : 3;
    } else if (type === 'IDAT') compressed.push(data);
    else if (type === 'IEND') {if (length) throw Error('Invalid PNG IEND'); ended = true; break;}
    offset += length + 12;
  }
  if (!ended || !width || !compressed.length) throw Error('Incomplete PNG');
  const stride = width * channels, expected = (stride + 1) * height;
  const raw = inflateSync(Buffer.concat(compressed), {maxOutputLength: expected + 1});
  if (raw.length !== expected) throw Error('Unexpected PNG scanline bytes');
  const decoded = Buffer.alloc(stride * height);
  for (let row = 0; row < height; row++) {
    const start = row * (stride + 1), filter = raw[start];
    if (filter > 4) throw Error('Unknown PNG filter');
    for (let x = 0; x < stride; x++) {
      const index = row * stride + x, a = x >= channels ? decoded[index - channels] : 0;
      const b = row ? decoded[index - stride] : 0, c = row && x >= channels ? decoded[index - stride - channels] : 0;
      const adjustment = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : paeth(a, b, c);
      decoded[index] = (raw[start + 1 + x] + adjustment) & 255;
    }
  }
  const pixels = Buffer.alloc(width * height * 4, 255);
  for (let i = 0; i < width * height; i++) for (let c = 0; c < channels; c++) pixels[i * 4 + c] = decoded[i * channels + c];
  return {width, height, pixels};
}

function chunk(type, data) {
  const kind = Buffer.from(type), result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0); kind.copy(result, 4); data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([kind, data])), 8 + data.length);
  return result;
}
export function encodePng({width, height, pixels}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width * height > 10_000_000 || pixels.length !== width * height * 4) throw Error('Invalid RGBA image');
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

export function compareVisibleAsset(withAsset, withoutAsset, threshold = 8) {
  const a = decodePng(withAsset), b = decodePng(withoutAsset);
  if (a.width !== b.width || a.height !== b.height) throw Error('PNG comparison dimensions differ');
  const pixels = Buffer.alloc(a.width * 2 * a.height * 4, 255);
  let changed = 0, sum = 0, maximum = 0;
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
    const source = (y * a.width + x) * 4, left = (y * a.width * 2 + x) * 4, right = left + a.width * 4;
    let delta = 0;
    for (let c = 0; c < 3; c++) {const d = Math.abs(a.pixels[source + c] - b.pixels[source + c]); delta = Math.max(delta, d); sum += d; pixels[left + c] = a.pixels[source + c];}
    if (delta > threshold) changed++;
    maximum = Math.max(maximum, delta);
    pixels[right] = Math.min(255, delta * 4); pixels[right + 1] = Math.min(255, delta); pixels[right + 2] = 0;
  }
  return {
    changedPixels: changed, totalPixels: a.width * a.height,
    changedFraction: changed / (a.width * a.height), meanAbsoluteChannelDifference: sum / (a.width * a.height * 3), maxChannelDifference: maximum,
    threshold, comparison: encodePng({width: a.width * 2, height: a.height, pixels}),
  };
}
