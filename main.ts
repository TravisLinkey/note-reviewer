import { BookmarkedNotificationView, VIEW_TYPE_BOOKMARKED_DASHBOARD } from "components/bookmarked-notification-dashboard";
import { DB } from "service/db";
import { FileStructureState } from "service/file-structure-state";
import { NotificationDashboardView, VIEW_TYPE_NOTIFICATION_DASHBOARD } from "components/notification-dashboard";
import { Plugin, TFile, WorkspaceLeaf, Notice } from "obsidian"

export interface Note {
	title: string;
	location: string;
	reviewed: boolean;
	tracked: boolean;
	bookmarked: boolean;
	last_reviewed: string;
	tags: string[]
}

export interface Tag {
	title: string;
}

export default class NotificationDashboardPlugin extends Plugin {
	private basePath: string;
	private db: DB;
	private fileStructure: FileStructureState;
	private pluginDirPath: string;
	private notificationDashboard: NotificationDashboardView;
	private isProcessing: boolean = false;
	private isInitialized: boolean = false;

	async onload() {
		
		const pluginId = this.manifest.id; // Get the plugin ID
		this.pluginDirPath = `.obsidian/plugins/${pluginId}`;

		this.db = new DB();
		await this.db.init();
		
		this.fileStructure = new FileStructureState(this.app, this.app.vault.getName(), this.db);
		await this.fileStructure.init();

		this.registerView(
			VIEW_TYPE_NOTIFICATION_DASHBOARD,
			(leaf) => new NotificationDashboardView(leaf, this.db, this)
		);

		this.registerView(
			VIEW_TYPE_BOOKMARKED_DASHBOARD,
			(leaf) => new BookmarkedNotificationView(leaf, this.db)
		);

		this.addRibbonIcon("bell", "Note Reviewer", () => {
			this.activateView();
		});

		// COMMENTED OUT: File event handlers to prevent crashes
		/*
		this.registerEvent(
			this.app.vault.on('create', (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					this.onModify(file);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					this.onModify(file);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile) {
					this.onDelete(file);
				}
			})
		);
		*/
		
		// Test database access
		try {
			await this.db.getAllNotifications();
		} catch (error) {
			console.error("DEBUG: Plugin load - Error accessing database:", error);
		}
		
		this.isInitialized = true;
	}

	async activateView() {
		const notificationLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_NOTIFICATION_DASHBOARD).first();
		if (notificationLeaf) {
			const view = notificationLeaf.view as NotificationDashboardView;
			await view.loadPage();
			return;
		}

		await this.app.workspace.getLeaf(true).setViewState({
			type: VIEW_TYPE_NOTIFICATION_DASHBOARD,
			active: true
		});
		this.app.workspace.revealLeaf(this.app.workspace.getLeavesOfType(VIEW_TYPE_NOTIFICATION_DASHBOARD)[0]);
	}

	async onModify(file: TFile) {
		try {
			const { vault } = this.app;

			const content = await vault.cachedRead(file);
			const tags = this.fileStructure.extractTagsFromMarkdown(content);

			const note = {
				title: file.name,
				location: file.path,
				reviewed: false,
				last_reviewed: new Date().toISOString(),
				tags
			} as Note;

			await this.db.upsertNotification(note);
			
			const notificationLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_NOTIFICATION_DASHBOARD).first();
			if (notificationLeaf) {
				const view = notificationLeaf.view as NotificationDashboardView;
				await view.loadDropdown();
			}
		} catch (e) {
			console.log("Error: ", e)
		}
	}

	async onRename() {
		const bookmarkLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_NOTIFICATION_DASHBOARD).first();
		await this.fileStructure.init();

		if (bookmarkLeaf) {
			// @ts-ignore
			const view = bookmarkLeaf.view as NotificationDashboardView;
			await view.loadPage();
		}
	}

	async showBookmarkedNotifications() {
		const existingLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOKMARKED_DASHBOARD)[0];
		if (!existingLeaf) {
			await this.app.workspace.getLeaf(true).setViewState({
				type: VIEW_TYPE_BOOKMARKED_DASHBOARD,
				active: true
			});
		} else {
			this.app.workspace.revealLeaf(existingLeaf);
		}
	}

	async onDelete(file: TFile) {
		await this.db.removeNotificationByLocation(file.path);
	}
}
