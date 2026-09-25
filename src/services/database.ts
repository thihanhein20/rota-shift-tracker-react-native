// src/services/database.ts
import * as SQLite from "expo-sqlite";
import { Shift } from "../types";

let db: SQLite.SQLiteDatabase | null = null;
let initialization: Promise<void> | null = null;

export function initDatabase(): Promise<void> {
  if (initialization) return initialization;

  initialization = (async () => {
    const database = await SQLite.openDatabaseAsync("rota.db");
    await database.execAsync(`
    CREATE TABLE IF NOT EXISTS shifts (
      id          TEXT PRIMARY KEY,
      date        TEXT NOT NULL,
      startTime   TEXT NOT NULL,
      endTime     TEXT NOT NULL,
      location    TEXT,
      role        TEXT,
      notes       TEXT,
      hoursWorked REAL NOT NULL,
      status      TEXT NOT NULL DEFAULT 'upcoming',
      rawSMS      TEXT NOT NULL,
      createdAt   TEXT NOT NULL
    );
  `);

    await database.execAsync(`
  CREATE TABLE IF NOT EXISTS week_rates (
    weekKey TEXT PRIMARY KEY,
    rate    REAL NOT NULL
  );
`);

    await database.execAsync(`
  CREATE TABLE IF NOT EXISTS events (
    id        TEXT PRIMARY KEY,
    title     TEXT NOT NULL,
    date      TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime   TEXT NOT NULL,
    notes     TEXT,
    createdAt TEXT NOT NULL
  );
`);
    db = database;
  })().catch((error) => {
    initialization = null;
    throw error;
  });

  return initialization;
}

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  await initDatabase();
  if (!db) throw new Error("Database failed to initialize.");
  return db;
}

export async function saveShift(shift: Shift): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO shifts
     (id, date, startTime, endTime, location, role, notes, hoursWorked, status, rawSMS, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      shift.id,
      shift.date,
      shift.startTime,
      shift.endTime,
      shift.location ?? null,
      shift.role ?? null,
      shift.notes ?? null,
      shift.hoursWorked,
      shift.status,
      shift.rawSMS,
      shift.createdAt,
    ],
  );
}

export async function getAllShifts(): Promise<Shift[]> {
  const database = await getDatabase();
  return database.getAllAsync<Shift>(
    "SELECT * FROM shifts ORDER BY date ASC, startTime ASC",
  );
}

export async function updateShiftStatus(
  id: string,
  status: Shift["status"],
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync("UPDATE shifts SET status = ? WHERE id = ?", [status, id]);
}

export async function deleteShift(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync("DELETE FROM shifts WHERE id = ?", [id]);
}

export async function getTodayShift(today: string): Promise<Shift | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<Shift>(
    "SELECT * FROM shifts WHERE date = ? LIMIT 1",
    [today],
  );
  return row ?? null;
}

export async function getWeekRate(weekKey: string): Promise<number | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ rate: number }>(
    "SELECT rate FROM week_rates WHERE weekKey = ?",
    [weekKey],
  );
  return row?.rate ?? null;
}

export async function saveWeekRate(
  weekKey: string,
  rate: number,
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    "INSERT OR REPLACE INTO week_rates (weekKey, rate) VALUES (?, ?)",
    [weekKey, rate],
  );
}

export async function saveEvent(event: {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  createdAt: string;
}): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO events
     (id, title, date, startTime, endTime, notes, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      event.id,
      event.title,
      event.date,
      event.startTime,
      event.endTime,
      event.notes ?? null,
      event.createdAt,
    ],
  );
}

export async function getAllEvents(): Promise<
  {
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    notes: string | null;
    createdAt: string;
  }[]
> {
  const database = await getDatabase();
  return database.getAllAsync(
    "SELECT * FROM events ORDER BY date ASC, startTime ASC",
  );
}

export async function deleteEvent(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync("DELETE FROM events WHERE id = ?", [id]);
}
