import { db } from './db';

const migrations = [
  {
    version: 1,
    up: () => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          password TEXT,
          api_key TEXT UNIQUE,
          auth_token TEXT UNIQUE,
          auth_token_created_at INTEGER,
          account_created_at INTEGER,
          api_key_created_at INTEGER,
          role TEXT DEFAULT 'user'
        );

        CREATE TABLE IF NOT EXISTS domains (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          domain_name TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS dns_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain_id INTEGER,
          record_type TEXT CHECK(record_type IN ('A', 'AAAA', 'TXT', 'NS', 'SOA', 'ALIAS')) NOT NULL,
          content TEXT NOT NULL,
          ttl INTEGER NOT NULL DEFAULT 3600,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS admin_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          admin_username TEXT NOT NULL,
          action TEXT NOT NULL,
          target_username TEXT,
          details TEXT,
          timestamp INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS app_config (
          id INTEGER PRIMARY KEY CHECK(id = 1),
          enable_web_registration INTEGER NOT NULL DEFAULT 0,
          auth_token_max_age INTEGER NOT NULL,
          base_domain TEXT,
          first_time_setup INTEGER NOT NULL DEFAULT 1,
          updated_at INTEGER NOT NULL
        );
      `);
    },
  },
];

export { migrations };
