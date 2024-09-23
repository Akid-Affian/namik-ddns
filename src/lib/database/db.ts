import { Database } from "bun:sqlite";
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { migrations } from './migrations';
import { backupDatabase } from './backup';

const baseDomain = process.env.BASE_DOMAIN ? process.env.BASE_DOMAIN.toLowerCase() : null;
let nameServers = process.env.NAMESERVERS ? process.env.NAMESERVERS.split(',').map(ns => ns.toLowerCase()) : [];

// Enforce a maximum of 6 nameservers
if (nameServers.length > 6) {
  console.error('Error: A maximum of 6 nameservers is allowed.');
  nameServers = nameServers.slice(0, 6); // Truncate to the first 6 nameservers
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

export const dbName = process.env.NODE_ENV === 'production' ? 'prod.db' : 'dev.db';
export const dbPath =
  process.env.NODE_ENV === 'production' ? path.join(prodDir, dbName) : path.join(devDir, dbName);

// Initialize the database
export const db = new Database(dbPath);

// Create a schema_migrations table to track both version numbers and UUIDs
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    uuid TEXT UNIQUE
  );
`);

const currentVersionRow = db
  .prepare(`SELECT MAX(version) as version FROM schema_migrations`)
  .get() as { version: number } | undefined;
const currentVersion = currentVersionRow?.version || 0;

// Apply pending migrations
let backupCreated = false; // Track if backup has been created
for (const migration of migrations) {
  if (migration.version > currentVersion) {
    if (!backupCreated) {
      // Create a backup before applying the first pending migration
      backupDatabase();
      backupCreated = true;
    }
    migration.up();
    db.prepare(`INSERT INTO schema_migrations (version, uuid) VALUES (?, ?)`).run(
      migration.version,
      crypto.randomUUID()
    );
    console.log(`Applied migration version ${migration.version}`);
  }
}

// Function to handle migrations using UUIDs to prevent version conflicts
function applyMigrationWithUUID(sql: string, version: number) {
  const migrationExists = db.prepare(`SELECT 1 FROM schema_migrations WHERE version = ?`).get(version);

  if (!migrationExists) {
    const uuid = crypto.randomUUID();

    if (!backupCreated) {
      backupDatabase(); // Create backup once
      backupCreated = true;
    }

    db.exec(sql);
    db.prepare(`INSERT INTO schema_migrations (version, uuid) VALUES (?, ?)`).run(version, uuid);
    console.log(`Applied migration version ${version} with UUID ${uuid}`);
  } else {
    console.log(`Migration version ${version} already applied. Skipping.`);
  }
}

// Check if the app_config row exists
const appConfigExists = db.prepare(`SELECT 1 FROM app_config WHERE id = 1 LIMIT 1`).get();
if (!appConfigExists) {
  db.exec(`
    INSERT INTO app_config (id, enable_web_registration, auth_token_max_age, base_domain, updated_at)
    VALUES (1, 0, 15, NULL, ${Date.now()})
  `);
}

if (baseDomain) {
  const now = Date.now();

  const currentBaseDomain = db
    .prepare(`SELECT base_domain FROM app_config WHERE id = 1`)
    .get() as { base_domain: string | null };

  if (!currentBaseDomain.base_domain) {
    db.prepare(
      `
      UPDATE app_config
      SET base_domain = ?, updated_at = ?
      WHERE id = 1
    `
    ).run(baseDomain, now);

    const hostmasterExists = db
      .prepare(`SELECT 1 FROM domains WHERE domain_name = ?`)
      .get(`hostmaster.${baseDomain}`);
    if (!hostmasterExists) {
      const insertDomainStmt = db.prepare(
        `
        INSERT INTO domains (user_id, domain_name, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `
      );
      insertDomainStmt.run(null, `hostmaster.${baseDomain}`, now, now);

      const insertDnsRecordStmt = db.prepare(
        `
        INSERT INTO dns_records (domain_id, record_type, content, ttl, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      );

      const systemOwnedNameservers = [];
      if (nameServers.length > 0) {
        for (const ns of nameServers) {
          if (ns.endsWith(`.${baseDomain}`)) {
            systemOwnedNameservers.push(ns);
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
}

// Handle the first-time setup status
const usersExist = db.prepare(`SELECT 1 FROM users LIMIT 1`).get();
if (!usersExist) {
  db.prepare(
    `
    UPDATE app_config
    SET first_time_setup = 1, updated_at = ?
    WHERE id = 1
  `
  ).run(Date.now());
} else {
  db.prepare(
    `
    UPDATE app_config
    SET first_time_setup = 0, updated_at = ?
    WHERE id = 1
  `
  ).run(Date.now());
}

export { backupDatabase };
