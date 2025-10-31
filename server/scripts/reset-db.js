import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATABASE_FILE = path.join(DATA_DIR, 'leaderboard.db');

if (fs.existsSync(DATABASE_FILE)) {
  fs.rmSync(DATABASE_FILE, { force: true });
  console.log('Cleared leaderboard history by removing', DATABASE_FILE);
} else {
  console.log('No leaderboard database found. Nothing to clear.');
}
