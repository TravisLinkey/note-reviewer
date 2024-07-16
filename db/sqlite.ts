import initSqlJs, { Database, SqlJsStatic } from "sql.js";

let SQL: SqlJsStatic;

export async function initDatabase(): Promise<Database> {
	if (!SQL) {
		SQL = await initSqlJs();
	}

	const db = await SQL.Database();

	return db;
}
