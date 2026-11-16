/**
 * Dungeons & Dynasties Save Codec & Signer Utility
 * Supports slot loading, decoding, re-encoding, and signature recalculation.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const C3 = 32;
const ECE = 8192;
const SAVE_PREFIX = '\x01DDZ1:';

function getSaveDir() {
  return path.join(process.env.APPDATA, 'io.itch.brettlittle.dungeons-and-dynasties', 'saves');
}

function getSavePath(slot = 1) {
  return path.join(getSaveDir(), `slot${slot}.sav`);
}

function unpackBits(e) {
  const origLen = (e.charCodeAt(0) - C3) | ((e.charCodeAt(1) - C3) << 15);
  const out = new Uint8Array(origLen);
  let n = 0, r = 0, a = 0;
  for (let o = 2; o < e.length && a < origLen; o++) {
    n = (n << 15) | (e.charCodeAt(o) - C3);
    r += 15;
    while (r >= 8 && a < origLen) {
      r -= 8;
      out[a++] = (n >>> r) & 255;
    }
    n &= (1 << r) - 1;
  }
  return out;
}

function packBits(uint8Arr) {
  const a = [];
  const i = uint8Arr.length;
  a.push((i & 32767) + C3, (i >>> 15 & 32767) + C3);
  let r = 0, s = 0;
  for (let d = 0; d < i; d++) {
    r = (r << 8) | uint8Arr[d];
    s += 8;
    while (s >= 15) {
      s -= 15;
      a.push(((r >>> s) & 32767) + C3);
      r &= (1 << s) - 1;
    }
  }
  if (s > 0) {
    a.push(((r << (15 - s)) & 32767) + C3);
  }
  let t = '';
  for (let d = 0; d < a.length; d += ECE) {
    t += String.fromCharCode(...a.slice(d, d + ECE));
  }
  return t;
}

function computeSig(str) {
  let a = 2166136261, i = 16777619;
  for (let r = 0; r < str.length; r++) {
    const s = str.charCodeAt(r);
    a = Math.imul(a ^ s, 16777619) >>> 0;
    i = Math.imul(i + s, 2246822507) >>> 0;
  }
  return a.toString(36) + '.' + i.toString(36);
}

function decodeSave(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const envelope = JSON.parse(raw);
  let dataStr = envelope.data;
  // Prefix is 6 chars: \x01DDZ1: or (space)DDZ1:
  const colonIdx = dataStr.indexOf(':');
  if (colonIdx !== -1 && colonIdx < 10) {
    dataStr = dataStr.slice(colonIdx + 1);
  }
  const unpackedBytes = unpackBits(dataStr);
  const jsonStr = zlib.inflateSync(Buffer.from(unpackedBytes)).toString('utf8');
  const state = JSON.parse(jsonStr);
  return { envelope, state };
}

function encodeSave(state) {
  state.sig = computeSig(JSON.stringify(state.guild));
  const jsonStr = JSON.stringify(state);
  const deflated = zlib.deflateSync(Buffer.from(jsonStr, 'utf8'));
  const packed = packBits(deflated);
  const envelope = {
    v: 1,
    writtenAt: Date.now(),
    data: SAVE_PREFIX + packed
  };
  return JSON.stringify(envelope);
}

module.exports = {
  getSaveDir,
  getSavePath,
  decodeSave,
  encodeSave,
  computeSig
};
