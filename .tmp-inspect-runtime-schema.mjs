import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.log(JSON.stringify({ connected: false, reason: "DATABASE_URL unavailable" }));
  process.exit(0);
}

const sql = postgres(connectionString, { max: 1, idle_timeout: 5, connect_timeout: 5 });
try {
  const [{ serverVersion, currentDatabase, currentUser, serverPort }] = await sql`
    select
      current_setting('server_version') as "serverVersion",
      current_database() as "currentDatabase",
      current_user as "currentUser",
      inet_server_port() as "serverPort"
  `;
  const columns = await sql`
    select table_name as "tableName", column_name as "columnName", data_type as "dataType",
           udt_name as "udtName", is_nullable as "isNullable"
    from information_schema.columns
    where table_schema = 'public'
    order by table_name, ordinal_position
  `;
  console.log(JSON.stringify({ connected: true, serverVersion, currentDatabase, currentUser, serverPort, columns }));
} catch (error) {
  console.log(JSON.stringify({ connected: false, error: error instanceof Error ? error.message : String(error) }));
} finally {
  await sql.end({ timeout: 5 });
}
