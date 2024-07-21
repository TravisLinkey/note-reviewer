import fs from "fs";
import readline from "readline";
import { QueueStorage } from "./queue-storage";
import { v4 as uuidv4 } from 'uuid';
import { Note } from "main";

interface FileStructure {
	[key: string]: FileStructure | null;
}

interface FileStructureDiff {
	added: string[];
	removed: string[];
}

export class FileStructureState {
	private archiveFile: string;
	private basePath: string;
	private currentState: FileStructure;
	private notesFile: string;
	private qs: QueueStorage;
	private stateFile: string;
	private tempFile: string;

	constructor(obsidianRootDir: string, pluginRootDir: string, queueStorage: QueueStorage) {
		this.basePath = obsidianRootDir;
		this.archiveFile = pluginRootDir + "/storage/archive.csv";
		this.notesFile = pluginRootDir + "/storage/notes.csv";
		this.stateFile = pluginRootDir + "/storage/oldState.txt";
		this.tempFile = pluginRootDir + "/storage/temp.csv";
		this.qs = queueStorage;
	}

	async main() {
		// this.writeStateFile(JSON.stringify(this.currentState));
		
		this.currentState = this.buildFileStructure(this.basePath);
		const oldState = this.getOldState();

		if (JSON.stringify(oldState) !== JSON.stringify(this.currentState)) {
			console.log("They are different");

			const diff = this.getDifference(oldState);
			console.log("Difference: ", diff);

			await this.updateArchives(diff);
			await this.updateNotifications(diff);

			// replace old state file
			this.writeStateFile(JSON.stringify(this.currentState));
		} else {
			console.log("They are the same");
		}

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
				} else {
					result[directory] = null;
				}
			}
		})

		return result;
	}

	async updateArchives(diff: FileStructureDiff) {
		await this.addNotificationsToStorage(diff);
		await this.deleteRemovedFiles(this.archiveFile, diff.removed);
	}

	async updateNotifications(diff: FileStructureDiff) {
		await this.deleteRemovedFiles(this.notesFile, diff.removed);
	}

	async deleteRemovedFiles(inputFilePath: string, filesToRemove: string[]) {
		if (!fs.existsSync(this.tempFile)) {
			fs.writeFileSync(this.tempFile, 'ID,TITLE,LOCATION,REVIEWED,TRACKED,BOOKMARKED,LAST_REVIEWED\n');
		}

		const inputStream = fs.createReadStream(inputFilePath);
		const outputStream = fs.createWriteStream(this.tempFile);
		const rl = readline.createInterface({
			input: inputStream,
			crlfDelay: Infinity
		});

		for await (const line of rl) {
			const shouldRemove = [...filesToRemove].some(filePath => line.includes(filePath))
			console.log(`SHOULD REMOVE FROM ${inputFilePath}: `, shouldRemove, " FILEPATH: ", line);
			if (!shouldRemove) {
				outputStream.write(line + "\n")
			}
		}

		outputStream.end();
		console.log("CSV file updated successfully.");
		fs.renameSync(this.tempFile, inputFilePath);
	}


	async addNotificationsToStorage(diff: FileStructureDiff) {
		const allNotes: Note[] = [];

		// add new notifications
		 diff.added.forEach(async (filePath: string) => {
		 	if (filePath.slice(-3) === '.md') {
		 		const note: Note = {
		 			id: uuidv4(),
		 			title: filePath.split('/').slice(-1)[0],
		 			location: filePath.replace(this.basePath, "").substring(1),
		 			reviewed: false,
		 			tracked: true,
		 			bookmarked: false,
		 			last_reviewed: new Date().toLocaleDateString()
		 		};

		 		console.log("Note: ", note);
				allNotes.push(note);
		 	}
		 })

		if (allNotes.length > 0) {
			await this.qs.writeNoteToCSV(allNotes, this.archiveFile);
		}
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
					diff.added.push(fullPath)
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

	writeStateFile(state: string): void {
		fs.writeFileSync(this.stateFile, state);
	}
}
