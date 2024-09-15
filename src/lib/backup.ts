import fs from 'fs';
import path from 'path';
import { db, dbPath, dbName } from './db';

function backupDatabase() {
  if (fs.existsSync(dbPath)) {
    // Only proceed if the database file exists
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name != 'schema_migrations';
    `).all();

    if (tables.length > 0) {
      const backupDir = path.join(process.cwd(), 'backups');
      const backupFileName = `${dbName}.backup-${Date.now()}.db`;
      const backupFilePath = path.join(backupDir, backupFileName);

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
      }

      fs.copyFileSync(dbPath, backupFilePath);
      console.log(`Database backup created at ${backupFilePath}`);
    } else {
      console.log('Database is empty. No backup created.');
    }
  } else {
    console.log('Database file does not exist. No backup created.');
  }
}

export { backupDatabase };
