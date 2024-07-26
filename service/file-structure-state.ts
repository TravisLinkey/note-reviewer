import fs from "fs";
import { DB } from "storage/db";
import { Note } from "main";
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { v4 as uuidv4 } from 'uuid';
import { warn } from "console";

interface FileStructure {
	[key: string]: FileStructure | null;
}

interface FileStructureDiff {
	added: string[];
	removed: string[];
}

export class FileStructureState {
	private basePath: string;
	private currentState: FileStructure;
	private db: DB;
	private stateFile: string;
	public allTags: Set<string>;

	constructor(obsidianRootDir: string, pluginRootDir: string, db: DB) {
		this.allTags = new Set();
		this.basePath = obsidianRootDir;
		this.db = db;
		this.stateFile = pluginRootDir + "/storage/oldState.txt";
	}


	async addNewFileToDatabase(added: string[]) {
		const notes: Note[] = [];

		added.forEach((filePath: string) => {
			const note = {
				id: uuidv4(),
				title: filePath.split("/").pop(),
				location: filePath,
				reviewed: false,
				last_reviewed: new Date('2023-01-01').toISOString()
			} as Note;
			notes.push(note);
		})
		await this.db.putBatchNotifications(notes);
	}

	/* A method to create the current file structure state file*/
	buildFileStructure(dirPath: string): FileStructure {
		const result: FileStructure = {};
		const directories = fs.readdirSync(dirPath);

		directories.forEach((directory) => {
			if (!directory.startsWith(".")) {
				const path = dirPath + "/" + directory;
				const stats = fs.statSync(path);

				if (stats.isDirectory()) {
					result[directory] = this.buildFileStructure(path);
				}
				else {
					result[directory] = null;
				}
			}
		})

		return result;
	}

	createAllNotes(allNotes: string[]): Note[] {
		const notes: Note[] = [];

		allNotes.forEach((filePath: string) => {
			const content = fs.readFileSync(filePath, 'utf-8');
			const tags = this.extractTagsFromMarkdown(content);

			const title = filePath.split("/").pop();
			const note = {
				id: uuidv4(),
				title: title,
				location: filePath.replace(this.basePath, "").substring(1),
				reviewed: false,
				last_reviewed: new Date('2023-01-01').toISOString(),
				tags
			} as Note;
			notes.push(note);
		})

		return notes;
	}

	async detectStatefileUpdates() {
		const oldState = this.getOldState();

		if (JSON.stringify(oldState) !== JSON.stringify(this.currentState)) {
			console.log("They are different");

			const diff = this.getDifference(oldState);
			console.log("Difference: ", diff);

			await this.updateFilesInDatabase(diff);

			// replace old state file
			this.writeStateFile(JSON.stringify(this.currentState));
		} else {
			console.log("They are the same");
		}
	}

	extractTagsFromMarkdown = (content: string): string[] => {
		const lines = content.split('\n').slice(0, 10);
		const tagPattern = /Tags:\s*((\[\[.*?\]\]\s*\|?\s*)+)/;
		const tagExtractPattern = /\[\[(.*?)\]\]/g;
		const tags = [];

		for (const line of lines) {
			const match = line.match(tagPattern);
			if (match) {
				let tagMatch;
				while ((tagMatch = tagExtractPattern.exec(match[1])) !== null) {
					tags.push(tagMatch[1]);
				}
				break;
			}
		}

		tags.forEach(tag => this.allTags.add(tag));

		return tags;
	};

	findMarkdownFiles(dir: string): string[] {
		let results: string[] = [];
		const directories = fs.readdirSync(dir);

		directories.forEach((directory) => {
			if (!directory.startsWith(".")) {
				const path = dir + "/" + directory;
				const stat = fs.statSync(path);

				if (stat && stat.isDirectory()) {
					const res = this.findMarkdownFiles(path);

					results = results.concat(res);
				} else if (path.endsWith('.md')) {
					results.push(path);
				}
			}
		})

		return results;
	}

	/* A method to get the difference between old and new file structures */
	getDifference(oldState: FileStructure): FileStructureDiff {
		const diff: FileStructureDiff = {
			added: [],
			removed: [],
		}

		const compare = (oldObj: FileStructure, newObj: FileStructure, parentPath = "") => {
			const oldKeys = new Set(Object.keys(oldObj));
			const newKeys = new Set(Object.keys(newObj));

			newKeys.forEach((key) => {
				const fullPath = parentPath ? `${parentPath}/${key}` : key;

				if (!oldKeys.has(key)) {
					// diff.added.push(fullPath.replace(this.basePath, "").substring(1))
					diff.added.push(fullPath.replace(this.basePath, "").substring(1));
				}
				else if (oldObj[key] !== null && newObj[key] !== null) {
					// both are directories, compare recursively
					compare(oldObj[key]!, newObj[key]!, fullPath);
				}
			})

			oldKeys.forEach((key) => {
				if (!newKeys.has(key)) {
					const fullPath = parentPath ? `${parentPath}/${key}` : key;
					diff.removed.push(fullPath.replace(this.basePath, "").substring(1));
				}
			})
		}

		compare(oldState, this.currentState, this.basePath);

		return diff;
	}

	/* Read the old state file into memory */
	getOldState(): FileStructure {
		const fileContent = fs.readFileSync(this.stateFile, 'utf-8');
		return JSON.parse(fileContent)
	}

	async init() {
		this.currentState = this.buildFileStructure(this.basePath);

		if (!fs.existsSync(this.stateFile)) {
			await this.db.removeDatabase();
			await this.db.createDatabases();

			await this.initNotificationsDatabase();
			await this.initTagsDatabase();
			this.writeStateFile(JSON.stringify(this.currentState));
		} else {
			this.detectStatefileUpdates();
		}
	}

	async initNotificationsDatabase() {
		const allFiles = this.findMarkdownFiles(this.basePath);
		const allNotes = this.createAllNotes(allFiles);

		await this.db.putBatchNotifications(allNotes);
		console.log("CREATED ALL NOTES");
	}

	async initTagsDatabase() {
		const array = [...this.allTags];
		const allTags = array.map((tag: string) => ({
			title: tag
		}))

		await this.db.putBatchTags(allTags);
	}

	async removeOldFileFromDatabase(filesToRemove: string[]) {
		filesToRemove.forEach(async (fileTitle: string) => {
			await this.db.removeNotificationsByTitle(fileTitle)
		})
	}

	async updateFilesInDatabase(diff: FileStructureDiff) {
		await this.addNewFileToDatabase(diff.added);
		await this.removeOldFileFromDatabase(diff.removed);
	}

	writeStateFile(state: string): void {
		fs.writeFileSync(this.stateFile, state);
	}
}
