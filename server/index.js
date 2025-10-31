import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATABASE_FILE = path.join(DATA_DIR, 'leaderboard.db');

const MAX_USERNAME_LENGTH = 32;
const BLOCKED_SUBSTRINGS = [
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'nazi',
  'hitler',
  'kkk',
  'slave',
  'terrorist',
  'whore',
  'rape',
];

const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

ensureDataDir();

const db = new Database(DATABASE_FILE);

db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_slug TEXT NOT NULL,
    pokes INTEGER NOT NULL CHECK (pokes >= 0),
    donuts INTEGER NOT NULL CHECK (donuts >= 0),
    total_donuts INTEGER NOT NULL CHECK (total_donuts > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_name_slug ON leaderboard_entries(name_slug);
  CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_created_at ON leaderboard_entries(created_at);
`);

const sanitizeUsername = (value) => {
  if (!value) return '';
  const normalized = value.normalize('NFKC');
  const stripped = normalized.replace(/[^\p{L}\p{N}\s'._-]/gu, '');
  const collapsed = stripped.replace(/\s+/g, ' ').trim();
  return collapsed.slice(0, MAX_USERNAME_LENGTH);
};

const containsBlockedLanguage = (candidate) => {
  if (!candidate) return false;
  const folded = candidate.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const normal = folded.toLowerCase().replace(/[\s'._-]+/g, '').replace(/[0-9]/g, '');
  return BLOCKED_SUBSTRINGS.some((needle) => normal.includes(needle));
};

const entrySchema = z.object({
  name: z.string().min(2).max(MAX_USERNAME_LENGTH),
  pokes: z.number().int().min(0).max(100000),
  donuts: z.number().int().min(0).max(1000),
  totalDonuts: z.number().int().min(1).max(1000),
});

const toSlug = (value) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s'._-]+/g, '');

const getLeaders = (limit = 25) =>
  db
    .prepare(
      `
        SELECT
          name,
          MAX(pokes) AS pokes,
          MAX(donuts) AS donuts,
          MAX(total_donuts) AS totalDonuts,
          MAX(updated_at) AS lastUpdated
        FROM leaderboard_entries
        GROUP BY name_slug
        ORDER BY pokes DESC, donuts DESC, lastUpdated ASC
        LIMIT ?
      `
    )
    .all(limit);

const getLog = (limit = 100) =>
  db
    .prepare(
      `
        SELECT
          id,
          name,
          pokes,
          donuts,
          total_donuts AS totalDonuts,
          created_at AS createdAt
        FROM leaderboard_entries
        ORDER BY created_at DESC
        LIMIT ?
      `
    )
    .all(limit);

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/leaderboard', (_req, res) => {
  const leaders = getLeaders();
  res.json({ leaders });
});

app.get('/leaderboard/log', (_req, res) => {
  const log = getLog();
  res.json({ entries: log });
});

app.post('/leaderboard', (req, res) => {
  try {
    const sanitized = sanitizeUsername(req.body?.name ?? '');
    if (containsBlockedLanguage(sanitized)) {
      return res.status(400).json({ message: 'Choose a different username.' });
    }
    const payload = entrySchema.parse({
      ...req.body,
      name: sanitized,
    });
    if (payload.donuts > payload.totalDonuts) {
      return res.status(400).json({ message: 'Donuts eliminated cannot exceed total donuts.' });
    }
    const now = new Date().toISOString();
    const slug = toSlug(payload.name);
    const insert = db.prepare(
      `
        INSERT INTO leaderboard_entries
          (name, name_slug, pokes, donuts, total_donuts, created_at, updated_at)
        VALUES
          (@name, @name_slug, @pokes, @donuts, @total_donuts, @created_at, @updated_at)
      `
    );
    insert.run({
      name: payload.name,
      name_slug: slug,
      pokes: payload.pokes,
      donuts: payload.donuts,
      total_donuts: payload.totalDonuts,
      created_at: now,
      updated_at: now,
    });
    const leaders = getLeaders();
    return res.status(201).json({
      entry: { ...payload, createdAt: now },
      leaders,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message ?? 'Invalid payload.' });
    }
    console.error('Failed to record leaderboard entry', error);
    return res.status(500).json({ message: 'Unable to record leaderboard entry right now.' });
  }
});

const PORT = process.env.PORT ?? 8787;

app.listen(PORT, () => {
  console.log(`Leaderboard service listening on port ${PORT}`);
});
