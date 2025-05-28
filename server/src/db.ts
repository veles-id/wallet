import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";

export async function initializeDatabase(): Promise<Database> {
  const db = await open({
    filename: "webauthn.db",
    driver: sqlite3.Database,
  });

  // Drop existing tables to ensure clean schema
  await db.exec(`
    DROP TABLE IF EXISTS devices;
    DROP TABLE IF EXISTS users;
  `);

  await db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      current_challenge TEXT
    );

    CREATE TABLE devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      credential_id BLOB NOT NULL,
      credential_public_key BLOB NOT NULL,
      counter INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  return db;
}
