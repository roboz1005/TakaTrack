export const SCHEMA_VERSION = 1;
/** migrations[i] upgrades a data snapshot from schema i+1 to i+2 */
export const migrations = [];
export function migrate(data) {
  let v = data.schemaVersion || 1;
  while (v < SCHEMA_VERSION) { data = migrations[v - 1](data); v += 1; data.schemaVersion = v; }
  return data;
}
