import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

// libsql's local (file:) mode reads/writes a plain SQLite file with no
// native compile step — chosen over better-sqlite3 because this machine has
// no C++ build toolchain, and better-sqlite3's prebuilt binaries don't yet
// cover this Node version on Windows. Functionally equivalent for our needs.
const sqlitePath = process.env.SQLITE_PATH ?? "./echonia.db";

const client = createClient({ url: `file:${sqlitePath}` });

export const db = drizzle(client, { schema });
