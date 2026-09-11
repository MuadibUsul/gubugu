import pg from 'pg';

const { Client } = pg;
const roleName = 'gubugu_app';
const password = process.env.APP_DATABASE_PASSWORD;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to provision the runtime role.');
}
if (!password || password.length < 24) {
  throw new Error('APP_DATABASE_PASSWORD must contain at least 24 characters.');
}

const quoteLiteral = (value) => `'${value.replaceAll("'", "''")}'`;
const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;
const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${roleName}') THEN
        CREATE ROLE ${roleName} LOGIN BYPASSRLS;
      END IF;
    END
    $$
  `);
  await client.query(
    `ALTER ROLE ${roleName} LOGIN BYPASSRLS PASSWORD ${quoteLiteral(password)}`,
  );
  const databaseName = (await client.query('select current_database() as name'))
    .rows[0].name;
  await client.query(
    `GRANT CONNECT ON DATABASE ${quoteIdentifier(databaseName)} TO ${roleName}`,
  );
  await client.query(`GRANT USAGE ON SCHEMA public TO ${roleName}`);
  await client.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${roleName}`,
  );
  await client.query(
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${roleName}`,
  );
  await client.query(`
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${roleName}
  `);
  await client.query(`
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO ${roleName}
  `);
  console.log('Runtime database role is ready.');
} finally {
  await client.end();
}
