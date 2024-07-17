
import { Database } from "sql.js";

export interface Note {
	id: string;
	title: string;
	location: string;
	reviewed: number;
	tracked: number;
	bookmarked: number;
	last_reviewed: string;
}

export class NotesController {
	private db: Database;

	//constructor(db: Database) {
	constructor() {
		// this.db = db;
		// this.initializeDatabase();
	}

	private initializeDatabase() {
		this.db.run(`
		CREATE TABLE IF NOT EXISTS Notes (
			id TEXT PRIMARY KEY,
			title TEXT,
			location TEXT,
			reviewed INTEGER,
			tracked INTEGER,
			bookmarked INTEGER,
			last_viewed DATETIME
		)
	`);
	}

	addNote(note: Note) {
		const query = `
			INSERT INTO Notes (id, title, location, reviewed, tracked, bookmarked, last_reviewed)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`
		const statement = this.db.prepare(query)
		statement.run();
		statement.free();
	}

	getNotes(): Note[] {
		const query = `SELECT * FROM Notes`;
		const statement = this.db.prepare(query);
		const result: Note[] = [];
		while (statement.step()) {
			const row = statement.getAsObject();

			const note: Note = {
				id: row.id as string,
				title: row.title as string,
				location: row.location as string,
				reviewed: row.reviewed as number,
				tracked: row.tracked as number,
				bookmarked: row.bookmarked as number,
				last_reviewed: row.last_reviewed as string
			}
			result.push(note);
		}
		statement.free();
		return result;
	}

	updateNote(note: Note) {
		const query = `
			UPDATE Notes
			SET title = ?, location = ?, reviewed = ?, tracked = ?, bookmarked = ?, last_reviewed = ?
			WHERE id = ?
		`;
		const statement = this.db.prepare(query);

		statement.bind([note.title, note.location, note.reviewed, note.tracked, note.bookmarked, note.last_reviewed, note.id])
		statement.run();
		statement.free();
	}

	deleteNoteById(id: string) {
		const query = `DELETE FROM Notes where id = ?`;
		const statement = this.db.prepare(query);

		statement.run();
		statement.free();
	}
}

