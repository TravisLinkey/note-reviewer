import { Database } from "sqlite3";

let SQL: any;

export const initDatabase = async (): Promise<Database>	=> {
	if (!SQL) {
		SQL = new Database("db.sqlite");
	}

	const db = new SQL.Database('db.sqlite');
	db.exec(`CREATE TABLE IF NOT EXISTS Notes (
        id TEXT PRIMARY KEY,
        location TEXT,
        reviewed BOOLEAN,
        tracked BOOLEAN,
        bookmarked BOOLEAN,
        last_reviewed DATETIME
    )`);

	return db;
}

