import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST || 'db',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'mamey',
  password: process.env.PGPASSWORD || 'mamey',
  database: process.env.PGDATABASE || 'mamey_planner',
});
