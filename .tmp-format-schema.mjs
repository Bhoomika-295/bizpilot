import fs from "node:fs";

const payload = JSON.parse(fs.readFileSync("/tmp/bizpilot-runtime-schema.json", "utf8"));
const byTable = new Map();
for (const column of payload.columns ?? []) {
  const list = byTable.get(column.tableName) ?? [];
  list.push(`${column.columnName}:${column.dataType}${column.isNullable === "NO" ? ":required" : ":nullable"}`);
  byTable.set(column.tableName, list);
}
console.log(`connection=${payload.connected}; version=${payload.serverVersion ?? "unknown"}; database=${payload.currentDatabase ?? "unknown"}; port=${payload.serverPort ?? "unknown"}`);
for (const [table, columns] of byTable) console.log(`${table}\t${columns.join(" | ")}`);
