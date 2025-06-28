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
				
				// Debug specific files that might contain ADR or ServiceCore
				if (tags.includes('ServiceCore')) {
					console.log("DEBUG: addNewFileToDatabase - Processing file:", file.name, "path:", file.path);
					console.log("DEBUG: addNewFileToDatabase - Extracted tags:", tags);
					console.log("DEBUG: addNewFileToDatabase - File content preview:", content.substring(0, 200));
				}
				
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

		console.log("DEBUG: createAllNotes - Starting to process", allNotes.length, "files");

		await Promise.all(allNotes.map(async (file: TFile) => {
			if (file instanceof TFile) {
				console.log("DEBUG: createAllNotes - Processing file:", file.name);

				const content = await this.app.vault.cachedRead(file);
				const tags = this.extractTagsFromMarkdown(content);

				console.log("DEBUG: createAllNotes - Extracted tags for", file.name + ":", tags);

				const note = {
					title: file.name,
					location: file.path,
					reviewed: false,
					last_reviewed: new Date().toISOString(),
					tags
				} as Note;
				
				notes.push(note);
				
				// Log if this note has tags
				if (tags.length > 0) {
					console.log("DEBUG: createAllNotes - Note with tags created:", note.title, "tags:", tags);
				}
			}
		}))

		console.log("DEBUG: createAllNotes - Completed processing, created", notes.length, "notes");
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
		const tags: string[] = [];

		// Extract tags from YAML frontmatter (new format)
		const yamlTags = this.extractTagsFromYamlFrontmatter(content);
		
		if (yamlTags.length > 0) {
			yamlTags.forEach(tag => this.allTags.add(tag));
			return yamlTags;
		}

		// No tags found
		return tags;
	};

	extractTagsFromYamlFrontmatter = (content: string): string[] => {
		const tags: string[] = [];

		// More robust regex that handles different line endings and edge cases
		const frontmatterMatch = content.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*/);
		if (!frontmatterMatch) {
			return tags;
		}
		
		const frontmatter = frontmatterMatch[1];
		const lines = frontmatter.split('\n');
		let inTagsSection = false;
		
		for (const line of lines) {
			const trimmedLine = line.trim();
			
			if (trimmedLine === 'tags:' || trimmedLine.startsWith('tags:')) {
				inTagsSection = true;
				const inlineMatch = line.match(/tags:\s*(.+)/);
				if (inlineMatch) {
					const tagString = inlineMatch[1].trim();
					if (tagString.startsWith('[') && tagString.endsWith(']')) {
						const tagsInBrackets = tagString.slice(1, -1);
						const tagList = tagsInBrackets.split(',').map(tag => tag.trim().replace(/['"]/g, ''));
						tags.push(...tagList.filter(tag => tag.length > 0));
					} else if (tagString && !tagString.startsWith('-')) {
						const tagList = tagString.split(',').map(tag => tag.trim().replace(/['"]/g, ''));
						tags.push(...tagList.filter(tag => tag.length > 0));
					}
				}
				// If no inline tags, continue to look for multi-line format
				continue;
			}
			if (inTagsSection) {
				if (trimmedLine && !line.startsWith(' ') && !line.startsWith('\t')) {
					inTagsSection = false;
					break;
				}
				const tagMatch = trimmedLine.match(/^\s*-\s*(.+)$/);
				if (tagMatch) {
					const tag = tagMatch[1].trim().replace(/['"]/g, '');
					if (tag.length > 0) {
						tags.push(tag);
					}
				}
			}
		}
		
		console.log("DEBUG: extractTagsFromYamlFrontmatter - Final tags:", tags);
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
		console.log("DEBUG: init - Starting simplified initialization");
		
		// Just do a basic scan and populate database
		await this.forceRescan();
		
		console.log("DEBUG: init - Simplified initialization completed");
	}

	async forceRescan() {
		console.log("DEBUG: forceRescan - Starting basic re-scan of all files");
		
		// Ensure database is initialized
		if (!this.db.isInitialized()) {
			console.log("DEBUG: forceRescan - Database not initialized, initializing...");
			await this.db.init();
		}
		
		const allFiles = this.app.vault.getMarkdownFiles();
		console.log("DEBUG: forceRescan - Found", allFiles.length, "markdown files");
		
		// Log some sample files to verify we're getting the right files
		console.log("DEBUG: forceRescan - Sample files:");
		allFiles.slice(0, 5).forEach(file => {
			console.log("  -", file.name, "path:", file.path);
		});
		
		// Check for specific files we know should exist
		const jeanPaulFile = allFiles.find(file => file.name.includes('Jean-Paul'));
		const standupFiles = allFiles.filter(file => file.name.includes('Standup'));
		
		console.log("DEBUG: forceRescan - Jean-Paul file found:", !!jeanPaulFile);
		console.log("DEBUG: forceRescan - Standup files found:", standupFiles.length);
		
		// Process all files and update database - simplified
		let successCount = 0;
		let errorCount = 0;
		
		for (const file of allFiles) {
			try {
				console.log("DEBUG: forceRescan - Processing file:", file.name);
				
				const content = await this.app.vault.cachedRead(file);
				const tags = this.extractTagsFromMarkdown(content);
				
				console.log("DEBUG: forceRescan - Extracted tags for", file.name + ":", tags);
				
				const note = {
					title: file.name,
					location: file.path,
					reviewed: false,
					last_reviewed: new Date().toISOString(),
					tags
				} as Note;
				
				await this.db.upsertNotification(note);
				successCount++;
				
				// Log if this note has tags
				if (tags.length > 0) {
					console.log("DEBUG: forceRescan - Note with tags created:", note.title, "tags:", tags);
				}
				
			} catch (error) {
				console.log("DEBUG: forceRescan - Error processing file:", file.name, error);
				errorCount++;
			}
		}
		
		console.log("DEBUG: forceRescan - Completed basic re-scan");
		console.log("DEBUG: forceRescan - Successfully processed:", successCount, "notes");
		console.log("DEBUG: forceRescan - Errors:", errorCount, "notes");
		
		// Verify the database has content
		const allNotifications = await this.db.getAllNotifications();
		console.log("DEBUG: forceRescan - Database now contains", allNotifications.length, "notifications");
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
