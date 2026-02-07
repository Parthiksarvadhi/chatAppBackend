const fs = require('fs');
const path = require('path');
const pool = require('./database');

const migrationsDir = path.join(__dirname, '../migrations');

async function runMigrations() {
  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get all migration files
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (!file.endsWith('.sql')) continue;

      const migrationName = file;
      const result = await pool.query(
        'SELECT * FROM migrations WHERE name = $1',
        [migrationName]
      );

      if (result.rows.length === 0) {
        console.log(`Running migration: ${migrationName}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await pool.query(sql);
        await pool.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [migrationName]
        );
        console.log(`✓ Completed: ${migrationName}`);
      }
    }

    console.log('All migrations completed');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

module.exports = { runMigrations };
