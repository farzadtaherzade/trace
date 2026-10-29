import type * as SQLite from 'expo-sqlite';

import { openDatabase } from '@/lib/sqlite-driver';

export type TraceStatus = 'recording' | 'paused' | 'completed' | 'unfinished' | 'archived';
export type ActivityType = 'run' | 'walk' | 'cycle' | 'drive';
export type GoalPeriod = 'daily' | 'weekly';
export type RewardKind = 'milestone' | 'challenge' | 'store' | 'streak';

export interface Trace {
  id: number;
  name: string;
  activityType: ActivityType;
  status: TraceStatus;
  startedAt: number;
  endedAt: number | null;
  pausedMs: number;
  pausedAt: number | null;
  distanceM: number;
  durationMs: number;
  maxSpeedMps: number | null;
  calories: number;
  pointsCount: number;
  weather: string | null;
  photoUri: string | null;
  note: string | null;
}

export interface TracePoint {
  id?: number;
  traceId: number;
  lat: number;
  lng: number;
  altitude: number | null;
  speed: number | null;
  accuracy: number | null;
  timestamp: number;
}

export interface Goal {
  id: number;
  kind: 'distance';
  targetM: number;
  period: GoalPeriod;
  createdAt: number;
}

export interface Reward {
  id: number;
  kind: RewardKind;
  code: string;
  unlockedAt: number;
  traceId: number | null;
}

export interface Store {
  id: number;
  name: string;
  lat: number;
  lng: number;
  note: string | null;
  createdAt: number;
  checkedInAt: number | null;
}

export interface Challenge {
  id: number;
  code: string;
  targetM: number;
  period: 'weekly';
  progressM: number;
  completedAt: number | null;
}

interface TraceRow {
  id: number;
  name: string;
  activity_type: string;
  status: string;
  started_at: number;
  ended_at: number | null;
  paused_ms: number;
  distance_m: number;
  duration_ms: number;
  max_speed_mps: number | null;
  calories: number;
  points_count: number;
  weather: string | null;
  photo_uri: string | null;
  paused_at: number | null;
  note: string | null;
}

/** camelCase Trace field → snake_case traces column. */
const TRACE_COLUMNS = {
  name: 'name',
  activityType: 'activity_type',
  status: 'status',
  startedAt: 'started_at',
  endedAt: 'ended_at',
  pausedMs: 'paused_ms',
  pausedAt: 'paused_at',
  distanceM: 'distance_m',
  durationMs: 'duration_ms',
  maxSpeedMps: 'max_speed_mps',
  calories: 'calories',
  pointsCount: 'points_count',
  weather: 'weather',
  photoUri: 'photo_uri',
  note: 'note',
} as const;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDatabase('trace.db').then(async (db) => {
      await db.execAsync(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS traces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  paused_ms INTEGER NOT NULL DEFAULT 0,
  paused_at INTEGER,
  distance_m REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  max_speed_mps REAL,
  calories INTEGER NOT NULL DEFAULT 0,
  points_count INTEGER NOT NULL DEFAULT 0,
  weather TEXT,
  photo_uri TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS trace_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id INTEGER NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  altitude REAL,
  speed REAL,
  accuracy REAL,
  timestamp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trace_points_trace ON trace_points(trace_id, timestamp);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  target_m INTEGER NOT NULL,
  period TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  unlocked_at INTEGER NOT NULL,
  trace_id INTEGER REFERENCES traces(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL,
  checked_in_at INTEGER
);

CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  target_m INTEGER NOT NULL,
  period TEXT NOT NULL,
  progress_m REAL NOT NULL DEFAULT 0,
  completed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_challenges_code ON challenges(code);
`);
      await migrateSchema(db);
      return db;
    });
  }

  return dbPromise;
}

/**
 * Idempotent migrations for databases created by older builds.
 *
 * - Adds the `note` column to `traces` (added alongside trip notes).
 * - Rebuilds `traces` if an early version of the background location task
 *   created it with only `id`/`status` columns — every other query in this
 *   module would fail against that shape. Dropping cascades to trace_points
 *   (foreign_keys = ON), which are unusable without the full table anyway.
 */
async function migrateSchema(db: SQLite.SQLiteDatabase) {
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(traces)');
  const present = new Set(columns.map((column) => column.name));

  if (present.size > 0 && !present.has('name')) {
    await db.execAsync('DROP TABLE traces;');
    await db.execAsync(`CREATE TABLE traces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  paused_ms INTEGER NOT NULL DEFAULT 0,
  paused_at INTEGER,
  distance_m REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  max_speed_mps REAL,
  calories INTEGER NOT NULL DEFAULT 0,
  points_count INTEGER NOT NULL DEFAULT 0,
  weather TEXT,
  photo_uri TEXT,
  note TEXT
);`);
    return;
  }

  if (!present.has('note')) {
    await db.execAsync('ALTER TABLE traces ADD COLUMN note TEXT;');
  }
}

function toTrace(row: TraceRow): Trace {
  return {
    id: row.id,
    name: row.name,
    activityType: row.activity_type as ActivityType,
    status: row.status as TraceStatus,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    pausedMs: row.paused_ms,
    distanceM: row.distance_m,
    durationMs: row.duration_ms,
    maxSpeedMps: row.max_speed_mps,
    calories: row.calories,
    pointsCount: row.points_count,
    weather: row.weather,
    photoUri: row.photo_uri,
    pausedAt: row.paused_at,
    note: row.note,
  };
}

export async function createTrace(name: string, activityType: ActivityType) {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO traces (name, activity_type, status, started_at) VALUES (?, ?, ?, ?)',
    name,
    activityType,
    'recording',
    Date.now(),
  );
  return result.lastInsertRowId;
}

export async function getTrace(id: number) {
  const db = await getDb();
  const row = await db.getFirstAsync<TraceRow>('SELECT * FROM traces WHERE id = ?', id);
  return row ? toTrace(row) : null;
}

export async function getActiveTrace() {
  const db = await getDb();
  const row = await db.getFirstAsync<TraceRow>(
    "SELECT * FROM traces WHERE status IN ('recording', 'paused') ORDER BY started_at DESC LIMIT 1",
  );
  return row ? toTrace(row) : null;
}

export async function listTraces() {
  const db = await getDb();
  const rows = await db.getAllAsync<TraceRow>(
    'SELECT * FROM traces WHERE status IN (?, ?, ?) ORDER BY started_at DESC',
    'completed',
    'unfinished',
    'archived',
  );
  return rows.map(toTrace);
}

export async function archiveTrace(id: number) {
  const db = await getDb();
  await db.runAsync('UPDATE traces SET status = ? WHERE id = ?', 'archived', id);
}

export async function updateTrace(id: number, updates: Partial<Omit<Trace, 'id'>>) {
  const entries = Object.entries(updates).filter(
    ([key, value]) =>
      key in TRACE_COLUMNS && value !== undefined,
  );
  if (entries.length === 0) {
    return;
  }

  const db = await getDb();
  const setClause = entries
    .map(([key]) => `${TRACE_COLUMNS[key as keyof typeof TRACE_COLUMNS]} = ?`)
    .join(', ');
  await db.runAsync(
    `UPDATE traces SET ${setClause} WHERE id = ?`,
    ...entries.map(([, value]) => value as string | number | null),
    id,
  );
}

export async function deleteTrace(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM traces WHERE id = ?', id);
}

export async function getPoints(traceId: number) {
  const db = await getDb();
  return db.getAllAsync<TracePoint>(
    'SELECT * FROM trace_points WHERE trace_id = ? ORDER BY timestamp ASC',
    traceId,
  );
}

export interface LocationBatchPoint {
  lat: number;
  lng: number;
  altitude: number | null;
  speed: number | null;
  accuracy: number | null;
  timestamp: number;
}

/**
 * Appends a background location batch to the trace that is currently in the
 * `recording` state. Called from the location task, which may run before any
 * screen has opened the database — getDb() guarantees the full schema exists.
 */
export async function insertLocationBatch(points: LocationBatchPoint[]) {
  if (points.length === 0) {
    return;
  }

  const db = await getDb();
  const row = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM traces WHERE status = 'recording' ORDER BY started_at DESC LIMIT 1",
  );
  if (!row) {
    return;
  }

  await db.withTransactionAsync(async () => {
    for (const point of points) {
      await db.runAsync(
        'INSERT INTO trace_points (trace_id, lat, lng, altitude, speed, accuracy, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        row.id,
        point.lat,
        point.lng,
        point.altitude,
        point.speed,
        point.accuracy,
        point.timestamp,
      );
    }
  });
}

export async function getGoal(period: GoalPeriod) {
  const db = await getDb();
  return db.getFirstAsync<Goal>('SELECT * FROM goals WHERE period = ? ORDER BY id DESC LIMIT 1', period);
}

export async function saveGoal(period: GoalPeriod, targetM: number) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO goals (kind, target_m, period, created_at) VALUES (?, ?, ?, ?)',
    'distance',
    targetM,
    period,
    Date.now(),
  );
}

export async function addReward(kind: RewardKind, code: string, traceId: number | null = null) {
  const db = await getDb();
  try {
    await db.runAsync(
      'INSERT INTO rewards (kind, code, unlocked_at, trace_id) VALUES (?, ?, ?, ?)',
      kind,
      code,
      Date.now(),
      traceId,
    );
  } catch {
    // Reward code is unique; ignore duplicate unlocks.
  }
}

export async function hasReward(code: string) {
  const db = await getDb();
  const row = await db.getFirstAsync<unknown>('SELECT 1 FROM rewards WHERE code = ?', code);
  return row !== null;
}

export async function listRewards() {
  const db = await getDb();
  return db.getAllAsync<Reward>('SELECT * FROM rewards ORDER BY unlocked_at DESC');
}

export async function addStore(name: string, lat: number, lng: number, note: string | null) {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO stores (name, lat, lng, note, created_at) VALUES (?, ?, ?, ?, ?)',
    name,
    lat,
    lng,
    note,
    Date.now(),
  );
  return result.lastInsertRowId;
}

export async function listStores() {
  const db = await getDb();
  return db.getAllAsync<Store>('SELECT * FROM stores ORDER BY created_at DESC');
}

export async function checkInStore(id: number) {
  const db = await getDb();
  await db.runAsync('UPDATE stores SET checked_in_at = ? WHERE id = ?', Date.now(), id);
}

export async function updateStore(
  id: number,
  updates: { name?: string; note?: string | null },
) {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return;
  }

  const db = await getDb();
  const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
  await db.runAsync(
    `UPDATE stores SET ${setClause} WHERE id = ?`,
    ...entries.map(([, value]) => value as string | null),
    id,
  );
}

export async function deleteStore(id: number) {
  const db = await getDb();
  await db.runAsync('DELETE FROM stores WHERE id = ?', id);
}

export async function getChallenge(code: string) {
  const db = await getDb();
  return db.getFirstAsync<Challenge>('SELECT * FROM challenges WHERE code = ?', code);
}

export async function upsertChallengeProgress(
  code: string,
  targetM: number,
  progressM: number,
  weekKey: string,
): Promise<Challenge | null> {
  const db = await getDb();
  const existing = await db.getFirstAsync<Challenge>('SELECT * FROM challenges WHERE code = ?', code);

  if (!existing) {
    const completed = progressM >= targetM;
    const result = await db.runAsync(
      'INSERT INTO challenges (code, target_m, period, progress_m, completed_at) VALUES (?, ?, ?, ?, ?)',
      code,
      targetM,
      'weekly',
      progressM,
      completed ? Date.now() : null,
    );
    return getChallengeById(db, result.lastInsertRowId);
  }

  const progress = Math.max(existing.progressM, progressM);
  const completed = existing.completedAt ?? (progress >= targetM ? Date.now() : null);
  await db.runAsync('UPDATE challenges SET progress_m = ?, completed_at = ? WHERE id = ?', progress, completed, existing.id);
  return { ...existing, progressM: progress, completedAt: completed };
}

async function getChallengeById(db: SQLite.SQLiteDatabase, id: number) {
  return db.getFirstAsync<Challenge>('SELECT * FROM challenges WHERE id = ?', id);
}

export async function listChallenges() {
  const db = await getDb();
  return db.getAllAsync<Challenge>('SELECT * FROM challenges ORDER BY rowid DESC');
}

export function currentWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function computeStreakDays(traces: Trace[]) {
  const days = new Set(
    traces
      .filter((trace) => trace.status === 'completed')
      .map((trace) => {
        const date = new Date(trace.startedAt);
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      }),
  );

  let streak = 0;
  const cursor = new Date();

  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  if (!days.has(key(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (days.has(key(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export async function exportAllJson() {
  const db = await getDb();
  const [traces, points, goals, rewards, stores, challenges] = await Promise.all([
    db.getAllAsync<TraceRow>('SELECT * FROM traces'),
    db.getAllAsync<TracePoint>('SELECT * FROM trace_points'),
    db.getAllAsync<Goal>('SELECT * FROM goals'),
    db.getAllAsync<Reward>('SELECT * FROM rewards'),
    db.getAllAsync<Store>('SELECT * FROM stores'),
    db.getAllAsync<Challenge>('SELECT * FROM challenges'),
  ]);

  return JSON.stringify({ traces, points, goals, rewards, stores, challenges }, null, 2);
}

export async function clearAllData() {
  const db = await getDb();
  await db.execAsync(`
DELETE FROM trace_points;
DELETE FROM traces;
DELETE FROM goals;
DELETE FROM rewards;
DELETE FROM stores;
DELETE FROM challenges;
`);
}
