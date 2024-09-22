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
  {
    version: 2,
    up: () => {
      db.exec(`
        BEGIN TRANSACTION;
        PRAGMA foreign_keys = OFF;
  
        CREATE TABLE IF NOT EXISTS additional_domains (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain_name TEXT NOT NULL UNIQUE,
          nameservers TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
  
        ALTER TABLE dns_records
        ADD COLUMN is_additional_domain INTEGER NOT NULL DEFAULT 0;
  
        ALTER TABLE dns_records
        ADD COLUMN additional_domain_id INTEGER DEFAULT NULL;
  
        ALTER TABLE dns_records RENAME TO dns_records_old;
  
        CREATE TABLE dns_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain_id INTEGER,
          record_type TEXT CHECK(record_type IN ('A', 'AAAA', 'TXT', 'NS', 'SOA', 'ALIAS')) NOT NULL,
          content TEXT NOT NULL,
          ttl INTEGER NOT NULL DEFAULT 3600,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          is_additional_domain INTEGER NOT NULL DEFAULT 0,
          additional_domain_id INTEGER DEFAULT NULL,
          FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
          FOREIGN KEY (additional_domain_id) REFERENCES additional_domains(id) ON DELETE CASCADE
        );
  
        INSERT INTO dns_records (id, domain_id, record_type, content, ttl, created_at, updated_at, is_additional_domain, additional_domain_id)
        SELECT id, domain_id, record_type, content, ttl, created_at, updated_at, is_additional_domain, additional_domain_id
        FROM dns_records_old;
  
        DROP TABLE dns_records_old;
  
        PRAGMA foreign_keys = ON;
  
        ALTER TABLE app_config
        ADD COLUMN app_version TEXT;
  
        ALTER TABLE app_config
        ADD COLUMN delete_base_domain_enabled INTEGER NOT NULL DEFAULT 0;
  
        COMMIT;
      `);
    },
  },
];

export { migrations };