import initSqlJs, { Database, SqlJsStatic } from "sql.js";

let SQL: SqlJsStatic;

export async function initDatabase(): Promise<Database> {
	if (!SQL) {
		SQL = await initSqlJs();
	}

	const db = new SQL.Database();
	db.run(`CREATE TABLE IF NOT EXISTS Notes (
        id TEXT PRIMARY KEY,
        location TEXT,
        reviewed BOOLEAN,
        tracked BOOLEAN,
        bookmarked BOOLEAN,
        last_reviewed DATETIME
    )`);

	return db;
}
