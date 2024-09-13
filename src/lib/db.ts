import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const baseDomain = process.env.BASE_DOMAIN || null;
let nameServers = process.env.NAMESERVERS ? process.env.NAMESERVERS.split(',') : [];

// Enforce a maximum of 6 nameservers
if (nameServers.length > 6) {
  console.error('Error: A maximum of 6 nameservers is allowed.');
  nameServers = nameServers.slice(0, 6);  // Truncate to the first 6 nameservers
}

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const devDir = path.join(dataDir, 'dev');
const prodDir = path.join(dataDir, 'prod');
if (!fs.existsSync(devDir)) {
  fs.mkdirSync(devDir);
}
if (!fs.existsSync(prodDir)) {
  fs.mkdirSync(prodDir);
}

const dbName = process.env.NODE_ENV === 'production' ? 'prod.db' : 'dev.db';
const dbPath = process.env.NODE_ENV === 'production' ? path.join(prodDir, dbName) : path.join(devDir, dbName);

const db = new Database(dbPath);

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

// Check if there are any users in the `users` table
const usersExist = db.prepare(`SELECT 1 FROM users LIMIT 1`).get();

const rowExists = db.prepare(`SELECT 1 FROM app_config WHERE id = 1 LIMIT 1`).get();
if (!rowExists) {
  db.exec(`
    INSERT INTO app_config (id, enable_web_registration, auth_token_max_age, base_domain, updated_at)
    VALUES (1, 0, 15, NULL, ${Date.now()})
  `);
}

if (baseDomain) {
  const now = Date.now();

  const currentBaseDomain = db.prepare(`SELECT base_domain FROM app_config WHERE id = 1`).get() as { base_domain: string | null };

  if (!currentBaseDomain.base_domain) {
    db.prepare(`
      UPDATE app_config
      SET base_domain = ?, updated_at = ?
      WHERE id = 1
    `).run(baseDomain, now);

    const hostmasterExists = db.prepare(`SELECT 1 FROM domains WHERE domain_name = ?`).get(`hostmaster.${baseDomain}`);
    if (!hostmasterExists) {
      const insertDomainStmt = db.prepare(`
        INSERT INTO domains (user_id, domain_name, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `);
      insertDomainStmt.run(null, `hostmaster.${baseDomain}`, now, now);

      const insertDnsRecordStmt = db.prepare(`
        INSERT INTO dns_records (domain_id, record_type, content, ttl, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      // Detect and handle subdomains of baseDomain in the nameservers
      const systemOwnedNameservers = [];
      if (nameServers.length > 0) {
        for (const ns of nameServers) {
          if (ns.endsWith(`.${baseDomain}`)) {
            // If the nameserver is a subdomain of baseDomain, mark it as system-owned
            systemOwnedNameservers.push(ns);
            // Insert system-owned nameserver into domains table
            insertDomainStmt.run(null, ns, now, now);
          }
          insertDnsRecordStmt.run(null, 'NS', ns, 60, now, now);
        }
        insertDnsRecordStmt.run(null, 'ALIAS', nameServers[0], 60, now, now);
      }

      const soaContent = `${baseDomain} hostmaster.${baseDomain} 1 3600 1800 1209600 3600`;
      insertDnsRecordStmt.run(null, 'SOA', soaContent, 3600, now, now);
    }
  }
} else {
  // Only set `first_time_setup = 1` if no users exist (i.e., setup hasn't been completed)
  if (!usersExist) {
    db.prepare(`
      UPDATE app_config
      SET first_time_setup = 1, updated_at = ?
      WHERE id = 1
    `).run(Date.now());
  } else {
    // If users exist, mark setup as complete (`first_time_setup = 0`)
    db.prepare(`
      UPDATE app_config
      SET first_time_setup = 0, updated_at = ?
      WHERE id = 1
    `).run(Date.now());
  }
}

export default db;
