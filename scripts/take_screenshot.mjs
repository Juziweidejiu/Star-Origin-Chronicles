import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const url = process.argv[2] || 'http://127.0.0.1:5199/game/?tab=roster&panel=roster';
const outFile = process.argv[3] || 'design/test_roster.png';
const outPath = path.resolve(outFile);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(os.tmpdir(), `chrome-shot-${Date.now()}`);

console.log(`Navigating to: ${url}`);
console.log(`Output: ${outPath}`);

try {
  execSync(
    `"${chromePath}" --headless=new --disable-gpu --hide-scrollbars --disable-web-security --user-data-dir="${userDataDir}" --window-size=390,844 --virtual-time-budget=9000 --screenshot="${outPath}" "${url}"`,
    { stdio: 'inherit' }
  );
  console.log('Finished. Exists:', fs.existsSync(outPath));
} catch (err) {
  console.error('Failed to take screenshot:', err.message);
}
