
import { Database } from "sql.js";

interface Note {
	id: string;
	location: string;
	reviewed: boolean;
	tracked: boolean;
	bookmarked: boolean;
	last_reviewed: string;
}

export class NotesController {
	private db: Database;

	constructor(db: Database) {
		this.db = db;
		this.initializeDatabase();
	}

	private initializeDatabase() {
		this.db.run(`
		CREATE TABLE IF NOT EXISTS Notes (
			id TEXT PRIMARY KEY,
			location TEXT,
			reviewed BOOLEAN,
			tracked BOOLEAN,
			bookmarked BOOLEAN,
			last_viewed DATETIME
		)
	`);
	}

	addNote(note: Note) {
		const query = `
			INSERT INTO Notes (id, location, reviewed, tracked, bookmarked, last_reviewed)
			VALUES (?, ?, ?, ?, ?, ?)
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
			result.push(statement.getAsObject() as Note);
		}
		statement.free();
		return result;
	}

	updateNote(note: Note) {
		const query = `
			UPDATE Notes
			SET location = ?, reviewed = ?, tracked = ?, bookmarked = ?, last_reviewed = ?
			WHERE id = ?
		`;
		const statement = this.db.prepare(query);

		statement.run(note.location, note.reviewed, note.tracked, note.bookmarked, note.last_reviewed);
		statement.free();
	}

	deleteNoteById(id: string) {
		const query = `DELETE FROM Notes where id = ?`;
		const statement = this.db.prepare(query);

		statement.run();
		statement.free();
	}
}

