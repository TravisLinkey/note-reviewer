import { App, TFile, TFolder } from "obsidian";
import { DB } from "service/db";
import { Note } from "main";

interface FileStructure {
	[key: string]: FileStructure | null;
}

interface FileStructureDiff {
	added: string[];
	removed: string[];
}

export class FileStructureState {
	private app: App;
	private basePath: string;
	private currentState: FileStructure;
	private db: DB;
	private stateFile: string;
	public allTags: Set<string>;
	private pluginDirPath: string;

	constructor(app: App, obsidianRootDir: string, db: DB) {
		this.allTags = new Set();
		this.app = app;
		this.basePath = obsidianRootDir;
		this.db = db;

		this.pluginDirPath = ".obsidian/plugins/note-reviewer";
		this.stateFile = ".obsidian/plugins/note-reviewer/storage/stateFile.csv";
	}


	async addNewFileToDatabase(added: string[]) {
		const notes = await Promise.all(added.map(async (filePath: string) => {

			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (file instanceof TFile) {
				const content = await this.app.vault.cachedRead(file);
				const tags = this.extractTagsFromMarkdown(content);
				return {
					title: file.name,
					location: file.path,
					reviewed: false,
					last_reviewed: new Date().toISOString(),
					tags
				} as Note;
			}
		}));

		if (notes.length > 0) {
			// @ts-ignore
			await this.db.putBatchNotifications(notes);
		}
	}


	async createAllNotes(allNotes: TFile[]): Promise<Note[]> {
		const notes: Note[] = [];

		await Promise.all(allNotes.map(async (file: TFile) => {
			if (file instanceof TFile) {

				const content = await this.app.vault.cachedRead(file);

				const tags = this.extractTagsFromMarkdown(content);

				const note = {
					title: file.name,
					location: file.path,
					reviewed: false,
					last_reviewed: new Date().toISOString(),
					tags
				} as Note;
				notes.push(note);
			}
		}))

		return notes;
	}

	async detectStatefileUpdates(): Promise<FileStructureDiff> {
		const oldState = await this.getOldState();
		const allFiles = this.app.vault.getFiles();

		const newState = allFiles.map(file => file.path);

		const changes = {
			added: [],
			removed: []
		};

		// Added rows
		for (const path of newState) {
			if (!oldState.includes(path)) {
				// @ts-ignore
				changes.added.push(path);
			}
		}

		// Deleted rows
		for (const path of oldState) {
			if (!newState.includes(path)) {
				// @ts-ignore
				changes.removed.push(path);
			}
		}

		return changes
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

	async findMarkdownFiles(dir: string): Promise<string[]> {
		let results: string[] = [];
		const folder = this.app.vault.getFolderByPath(dir);

		if (!(folder instanceof TFolder)) {
			throw new Error(`${dir} is not a directory`);
		}

		for (const file of folder.children) {
			if (!file.name.startsWith(".")) {
				const path = `${dir}/${file.name}`;

				if (file instanceof TFolder) {
					const res = await this.findMarkdownFiles(path);
					results = results.concat(res);
				} else if (file instanceof TFile && path.endsWith('.md')) {
					results.push(path);
				}
			}
		}

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
	async getOldState(): Promise<string[]> {
		const oldCSVContent = await this.app.vault.adapter.read(this.stateFile);
		return oldCSVContent.split('\n').map(line => line.replace(",", ""));
	}

	async init() {
		const { vault } = this.app;

		// if storage exists, check for changes
		const stat = await vault.adapter.stat(this.pluginDirPath + "/storage");

		if (stat) {
			const changes = await this.detectStatefileUpdates();

			if (changes.added.length > 0 || changes.removed.length > 0) {
				await this.updateFilesInDatabase(changes);
				await this.updateStateFile();
			}

			const allNotifications = await this.db.getAllNotifications();
			if (allNotifications.length < 1) {
				await this.initNotificationsDatabase();
			}

		} else {
			// initialize everything 
			await this.createStateFile();
			await this.initNotificationsDatabase();
			await this.updateStateFile();
		}

	}

	async createStateFile(): Promise<void> {
		const { vault } = this.app;

		try {
			await vault.createFolder(this.pluginDirPath + "/storage");
		} catch (e) {
			console.error("Error: ", e);
			throw e;
		}
	}

	async detectChangesBetweenCSVFiles() {
		const changes = {
			added: [],
			deleted: [],
		};

		const { vault } = this.app;

		// @ts-ignore
		const storageFolderPath = ".obsidian/plugins/note-reviewer/storage";

		try {
			const oldCSVContent = await vault.adapter.read(storageFolderPath + '/stateFile_OLD.csv');
			const newCSVContent = await vault.adapter.read(storageFolderPath + '/stateFile_NEW.csv');

			const oldState = this.parseCSV(oldCSVContent);
			const newState = this.parseCSV(newCSVContent);

			// Added rows
			for (const path of newState) {
				if (!oldState.includes(path)) {
					// @ts-ignore
					changes.added.push(path);
				}
			}

			// Deleted rows
			for (const path of oldState) {
				if (!newState.includes(path)) {
					// @ts-ignore
					changes.deleted.push(path);
				}
			}

			return changes;
		} catch (e) {
			console.error("Error reading csv files", e);
		}

	}

	async initNotificationsDatabase() {
		const allFiles = this.app.vault.getMarkdownFiles();
		const allNotes = await this.createAllNotes(allFiles);

		await this.db.putBatchNotifications(allNotes);
	}

	parseCSV(csvContent: string): string[] {
		return csvContent.split('\n');
	}

	async removeOldFileFromDatabase(filesToRemove: string[]) {
		await Promise.all(filesToRemove.map(async (file: string) => {
			const notification = await this.db.getNotificationByLocation(file);

			if (notification) {
				await this.db.removeNotificationByLocation(file)
			}
		}));
	}

	async updateFilesInDatabase(diff: FileStructureDiff) {
		await this.addNewFileToDatabase(diff.added);
		await this.removeOldFileFromDatabase(diff.removed);
	}

	async updateStateFile(): Promise<void> {
		const { vault } = this.app;

		const files = vault.getFiles();
		const filePaths = files.map(file => file.path + ",");

		try {
			const stateFilePath = this.pluginDirPath + "/storage/stateFile.csv";
			const stateFile = await vault.adapter.stat(stateFilePath);

			if (stateFile) {
				await vault.adapter.remove(stateFilePath);
			}

			await vault.create(stateFilePath, filePaths.join("\n"));

		} catch (e) {
			console.error("Error creating state file: ", e);
		}
	}

	async writeStateFile(state: string): Promise<void> {
		try {
			const file = this.app.vault.getAbstractFileByPath(this.stateFile);
			if (file instanceof TFile) {
				await this.app.vault.modify(file, state);
			} else {
				await this.app.vault.create(this.stateFile, state);
			}
		} catch (error) {
			console.error("Error: ", error);
		}
	}
}
