import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const zipPath = path.join(ROOT, 'docs', 'art_assets_batch_b.zip');
const tempDir = path.join(ROOT, 'artResources', 'batch_b');
const targetDir = path.join(ROOT, 'mobile-pwa', 'public', 'art', 'heroes');

console.log('1. 解压 batch_b 到 artResources/batch_b ...');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
execSync(`tar -xf "${zipPath}" -C "${tempDir}"`);

const files = fs.readdirSync(tempDir).filter((f) => f.endsWith('.webp'));
console.log(`共解压出 ${files.length} 个 WebP 文件。\n`);

// 解析 WebP 尺寸与头部信息
function parseWebP(buffer) {
  const riff = buffer.subarray(0, 4).toString('ascii');
  const webp = buffer.subarray(8, 12).toString('ascii');
  if (riff !== 'RIFF' || webp !== 'WEBP') {
    return { valid: false, reason: 'Not a RIFF/WEBP file' };
  }

  const chunkType = buffer.subarray(12, 16).toString('ascii');
  let width = 0;
  let height = 0;
  let hasAlpha = false;

  if (chunkType === 'VP8X') {
    const flags = buffer.readUInt8(20);
    hasAlpha = (flags & 0x10) !== 0;
    // 24-bit width and height in VP8X (canvas width - 1)
    width = 1 + buffer.readUIntLE(24, 3);
    height = 1 + buffer.readUIntLE(27, 3);
  } else if (chunkType === 'VP8 ') {
    // Lossy VP8 bitstream
    const keyframe = (buffer.readUInt8(23) & 1) === 0;
    const startCode = buffer.readUIntLE(23, 3); // 0x9d012a
    width = buffer.readUInt16LE(26) & 0x3fff;
    height = buffer.readUInt16LE(28) & 0x3fff;
  } else if (chunkType === 'VP8L') {
    // Lossless VP8L bitstream
    const b1 = buffer.readUInt8(21);
    const b2 = buffer.readUInt8(22);
    const b3 = buffer.readUInt8(23);
    const b4 = buffer.readUInt8(24);
    width = 1 + (((b2 & 0x3f) << 8) | b1);
    height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
    hasAlpha = (b4 & 0x10) !== 0;
  }

  return {
    valid: true,
    chunkType,
    width,
    height,
    hasAlpha,
  };
}

const stats = [];
for (const file of files) {
  const filePath = path.join(tempDir, file);
  const buf = fs.readFileSync(filePath);
  const info = parseWebP(buf);
  const sizeKb = (buf.length / 1024).toFixed(1);
  stats.push({
    file,
    sizeKb,
    ...info,
  });
}

console.log('2. 格式与尺寸体检报告：');
console.table(
  stats.map((s) => ({
    文件名: s.file,
    类型: s.chunkType,
    尺寸: `${s.width}x${s.height}`,
    透明通道: s.hasAlpha ? '有' : '无',
    大小: `${s.sizeKb} KB`,
  }))
);

// 复制到 public/art/heroes/
console.log('\n3. 复制到 mobile-pwa/public/art/heroes/ ...');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

for (const file of files) {
  const src = path.join(tempDir, file);
  const dst = path.join(targetDir, file);
  fs.copyFileSync(src, dst);
}
console.log(`成功接入 ${files.length} 张英雄立绘到 ${targetDir}`);
