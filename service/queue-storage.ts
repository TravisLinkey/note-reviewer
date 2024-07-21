import csv from 'csv-parser';
import fs from 'fs';
import { Note } from "controllers/notes";
import { createObjectCsvWriter } from 'csv-writer';
import { CsvWriter } from 'csv-writer/src/lib/csv-writer';

const header = [
	{ id: 'id', title: 'ID' },
	{ id: 'title', title: 'TITLE' },
	{ id: 'location', title: 'LOCATION' },
	{ id: 'reviewed', title: 'REVIEWED' },
	{ id: 'tracked', title: 'TRACKED' },
	{ id: 'bookmarked', title: 'BOOKMARKED' },
	{ id: 'last_reviewed', title: 'LAST_REVIEWED' },
]

export class QueueStorage {
	private archiveFile: string;
	private archiveWriter: CsvWriter<any>;
	private basePath: string;
	private favoritesFile: string;
	private notesFile: string;
	private notesWriter: CsvWriter<any>;
	private oldStateFile: string;

	constructor(basePath: string) {
		this.archiveFile = this.basePath + "/storage/archive.csv";
		this.basePath = basePath;
		this.favoritesFile = this.basePath + "/storage/favorites.csv";
		this.notesFile = this.basePath + "/storage/notes.csv";
		this.oldStateFile = this.basePath + "/storage/oldState.txt";

		this.initialize();
	}

	async getTopNNotes(n: number, filepath: string): Promise<Note[]> {
		const notes = await this.readNotesFromCSV(filepath);
		return notes.slice(0, n);
	}

	initialize() {
		const storageDir = this.basePath + "/storage";
		if (!fs.existsSync(storageDir)) {
			fs.mkdirSync(storageDir, { recursive: true });
		}
		if (!fs.existsSync(this.notesFile)) {
			fs.writeFileSync(this.notesFile, 'ID,TITLE,LOCATION,REVIEWED,TRACKED,BOOKMARKED,LAST_REVIEWED\n');
		}
		if (!fs.existsSync(this.archiveFile)) {
			fs.writeFileSync(this.archiveFile, 'ID,TITLE,LOCATION,REVIEWED,TRACKED,BOOKMARKED,LAST_REVIEWED\n');
		}
		if (!fs.existsSync(this.oldStateFile)) {
			// TODO - CRAWL THE ROOT - CREATE ARCHIVE NOTIFICATIONS
			fs.writeFileSync(this.oldStateFile, '');
		}

		this.notesWriter = createObjectCsvWriter({
			path: this.notesFile,
			header,
			append: true
		});
		this.archiveWriter = createObjectCsvWriter({
			path: this.archiveFile,
			header,
			append: true
		});
	}

	async getNotesCount(): Promise<number> {
		const notes = await this.readNotesFromCSV(this.notesFile);
		return notes.length;
	}

	async overwriteCsv(notes: Note[], filepath: string): Promise<void> {
		const writer = createObjectCsvWriter({
			path: filepath,
			header
		});

		await writer.writeRecords(notes);
	}

	async pullNotesFromArchive(): Promise<void> {
		const notes = await this.getTopNNotes(10, this.archiveFile);
		await this.removeTopNNotes(10, this.archiveFile);
		await this.writeNoteToCSV(notes, this.notesFile);
	}

	async pullNotesFromStorage(): Promise<Note[]> {
		return await this.getTopNNotes(10, this.notesFile);
	}

	async pushNotesToArchive(notes: Note[]) {
		await this.writeNoteToCSV(notes, this.archiveFile);
	}

	readNotesFromCSV = (filepath: string): Promise<Note[]> => {
		return new Promise((resolve, reject) => {
			const notes: Note[] = [];

			fs.createReadStream(filepath).pipe(csv()).on('data', (row: any) => {
				if (row && row.ID) {
					const note: Note = {
						id: row.ID,
						title: row.TITLE,
						location: row.LOCATION,
						reviewed: row.REVIEWED === 'true',
						tracked: row.TRACKED === 'true',
						bookmarked: row.BOOKMARKED === 'true',
						last_reviewed: row.LAST_REVIEWED,
					}
					notes.push(note);
				}
			}).on('end', () => {
				resolve(notes);
			}).on('error', (error: Error) => {
				reject(error);
			})
		})
	}

	async removeSelectedNotesFromStorage(selectedIds: string[]): Promise<void> {
		const notes = await this.readNotesFromCSV(this.notesFile);
		const removedNotes = notes.filter(note => selectedIds.includes(note.id));
		const remainingNotes = notes.filter(note => !selectedIds.includes(note.id));

		console.log("Remaining notes: ", remainingNotes)

		await this.overwriteCsv(remainingNotes, this.notesFile);
		await this.writeNoteToCSV(removedNotes, this.archiveFile);
	}

	async removeTopNNotes(n: number, filepath: string): Promise<void> {
		const notes = await this.readNotesFromCSV(filepath);
		const remainingNotes = notes.slice(n);

		console.log(`Overwriting notes in : ${filepath}`);
		try {
			await this.overwriteCsv(remainingNotes, filepath);
		} catch (error) {
			console.log("Error: ", error);
		}

	}

	async writeNoteToCSV(notes: Note[], filepath: string): Promise<void> {
		if (notes.length < 1) {
			return;
		}

		console.log("Writing to file");
		try {
			if (filepath === this.notesFile) {
				await this.notesWriter.writeRecords(notes);
				console.log('...wrote to notes file');
			} else {
				await this.archiveWriter.writeRecords(notes);
				console.log('...wrote to archive file');
			}
		} catch (error) {
			console.log("Error: ", error);
		}
	};
}

