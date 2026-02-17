require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL || process.env.EXTERNAL_DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is not set.');
    console.error('Set it to your Render External Database URL, e.g.:');
    console.error("postgresql://user:pass@host.region-postgres.render.com/dbname");
    process.exit(1);
  }

  const sqlPath = path.resolve(__dirname, '..', 'neon-schema.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('neon-schema.sql not found in project root.');
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Running schema SQL (this may take a few seconds)...');
    await client.query(sql);
    console.log('Schema loaded successfully.');
  } catch (err) {
    console.error('Failed to load schema:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
