import { DB } from "service/db";
import { Note } from "main";
import { App, TFile, TFolder } from "obsidian";

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
	private storageFolder: string;
	public allTags: Set<string>;

	constructor(app: App, obsidianRootDir: string, pluginRootDir: string, db: DB) {
		this.allTags = new Set();
		this.app = app;
		this.basePath = obsidianRootDir;
		this.db = db;
		this.stateFile = pluginRootDir + "/storage/oldState.txt";
		this.storageFolder = pluginRootDir + '/storage';
	}


	async addNewFileToDatabase(added: string[]) {
		const notes: Note[] = [];

		added.forEach(async (filePath: string) => {
			// const content = fs.readFileSync(this.basePath + "/" + filePath, 'utf-8');

			const file = this.app.vault.getAbstractFileByPath(this.basePath + '/' + filePath);
			if (file instanceof TFile) {
				const content = await this.app.vault.read(file);

				const tags = this.extractTagsFromMarkdown(content);

				const title = filePath.split("/").pop();
				const note = {
					title,
					location: filePath,
					reviewed: false,
					last_reviewed: new Date().toISOString(),
					tags
				} as Note;
				notes.push(note);
			}
		})
		await this.db.putBatchNotifications(notes);
	}

	/* A method to create the current file structure state file*/
	async buildFileStructure(filePath: string): Promise<FileStructure> {
		const result: FileStructure = {};

		const folder = this.app.vault.getFolderByPath(filePath.replace('//', "/"));
		if (!(folder instanceof TFolder)) {
			throw new Error(`${filePath} is not a directory`);
		}

		for (const file of folder.children) {
			if (!file.name.startsWith(".")) {
				const path = `${filePath}/${file.name}`;

				if (file instanceof TFolder) {
					result[file.name] = await this.buildFileStructure(path);
				} else if (file instanceof TFile) {
					result[file.name] = null;
				}
			}
		}

		return result;
	}

	createAllNotes(allNotes: string[]): Note[] {
		const notes: Note[] = [];

		allNotes.forEach(async (filePath: string) => {

			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (file instanceof TFile) {
				const content = await this.app.vault.read(file);

				// const content = fs.readFileSync(filePath, 'utf-8');
				const tags = this.extractTagsFromMarkdown(content);

				const title = filePath.split("/").pop();
				const note = {
					title,
					location: filePath.replace(this.basePath, "").substring(1),
					reviewed: false,
					last_reviewed: new Date().toISOString(),
					tags
				} as Note;
				notes.push(note);
			}
		})

		return notes;
	}

	async detectStatefileUpdates() {
		const oldState = this.getOldState();

		if (JSON.stringify(oldState) !== JSON.stringify(this.currentState)) {
			const diff = this.getDifference(oldState);
			await this.updateFilesInDatabase(diff);

			// replace old state file
			this.writeStateFile(JSON.stringify(this.currentState));
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

	// 	findMarkdownFiles(dir: string): string[] {
	// 		let results: string[] = [];
	// 		const directories = fs.readdirSync(dir);
	// 
	// 		directories.forEach((directory) => {
	// 			if (!directory.startsWith(".")) {
	// 				const path = dir + "/" + directory;
	// 				const stat = fs.statSync(path);
	// 
	// 				if (stat && stat.isDirectory()) {
	// 					const res = this.findMarkdownFiles(path);
	// 
	// 					results = results.concat(res);
	// 				} else if (path.endsWith('.md')) {
	// 					results.push(path);
	// 				}
	// 			}
	// 		})
	// 
	// 		return results;
	// 	}

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
	async getOldState(): FileStructure {

		// const fileContent = fs.readFileSync(this.stateFile, 'utf-8');
		const file = this.app.vault.getAbstractFileByPath(this.stateFile);
		if (file instanceof TFile) {
			const fileContent = await this.app.vault.read(file);
			return JSON.parse(fileContent)
		}

		return {};
	}

	// 	async init() {
	// 		if (!fs.existsSync(this.storageFolder)) {
	// 			fs.mkdirSync(this.storageFolder, { recursive: true });
	// 		}
	// 
	// 		this.currentState = this.buildFileStructure(this.basePath);
	// 
	// 		if (!fs.existsSync(this.stateFile)) {
	// 			await this.initNotificationsDatabase();
	// 			await this.initTagsDatabase();
	// 			this.writeStateFile(JSON.stringify(this.currentState));
	// 		} else {
	// 			this.detectStatefileUpdates();
	// 		}
	// 	}

	async init() {
		const storageFolder = this.app.vault.adapter.getResourcePath(this.storageFolder);

		if (!storageFolder) {
			await this.app.vault.createFolder(this.storageFolder);
		}

		this.currentState = await this.buildFileStructure(this.app.vault.getRoot().path);

		const stateFile = this.app.vault.getAbstractFileByPath(this.stateFile);
		if (!stateFile) {
			await this.initNotificationsDatabase();
			await this.initTagsDatabase();
			this.writeStateFile(JSON.stringify(this.currentState));
		} else {
			this.detectStatefileUpdates();
		}
	}

	async initNotificationsDatabase() {
		const allFiles = await this.findMarkdownFiles(this.app.vault.getRoot().path);
		const allNotes = this.createAllNotes(allFiles);
		await this.db.putBatchNotifications(allNotes);
	}

	async initTagsDatabase() {
		const array = [...new Set(this.allTags)];

		const allTags = array.map((tag: string) => ({
			title: tag
		}))

		await this.db.putBatchTags(allTags);
	}

	async removeOldFileFromDatabase(filesToRemove: string[]) {
		const oldTags: string[] = [];
		filesToRemove.forEach(async (fileTitle: string) => {
			// get each notification to be removed
			const notification = await this.db.getNotificationByLocation(fileTitle);
			oldTags.push(...notification.tags);

			oldTags.forEach(async (tag: string) => {
				const notifications = await this.db.getNotificationByTag(tag);
				if (notifications.length == 1) {
					await this.db.removeTagByTitle(tag);
				}
			})

			await this.db.removeNotificationsByTitle(fileTitle)
		})

	}

	async updateFilesInDatabase(diff: FileStructureDiff) {
		await this.addNewFileToDatabase(diff.added);
		await this.removeOldFileFromDatabase(diff.removed);
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
			console.log("Error: ", error);
		}
	}
}
