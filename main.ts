import { BookmarkedNotificationView, VIEW_TYPE_BOOKMARKED_DASHBOARD } from "components/bookmarked-notification-dashboard";
import { DB } from "service/db";
import { FileStructureState } from "service/file-structure-state";
import { NotificationDashboardView, VIEW_TYPE_NOTIFICATION_DASHBOARD } from "components/notification-dashboard";
import { Plugin, TFile, WorkspaceLeaf } from "obsidian"

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

	async onload() {
		const pluginId = this.manifest.id; // Get the plugin ID
		this.pluginDirPath = `.obsidian/plugins/${pluginId}`;

		this.db = new DB();
		await this.db.init();

		this.app.workspace.onLayoutReady(async () => {
			// @ts-ignore
			this.fileStructure = new FileStructureState(this.app, this.app.vault.adapter.basePath, this.db);

			await this.fileStructure.init();

			this.registerView(
				VIEW_TYPE_NOTIFICATION_DASHBOARD,
				(leaf: WorkspaceLeaf) => new NotificationDashboardView(leaf, this.db, this)
			)

			this.registerView(
				VIEW_TYPE_BOOKMARKED_DASHBOARD,
				(leaf: WorkspaceLeaf) => new BookmarkedNotificationView(leaf, this.db)
			)
		})

		this.registerEvent(this.app.vault.on('rename', this.onRename.bind(this)))
		this.registerEvent(this.app.vault.on('delete', this.onRename.bind(this)))
		this.registerEvent(this.app.vault.on('modify', this.onModify.bind(this)))

		this.addRibbonIcon("bell", "Open Notification Dashboard", async () => await this.activateView());

		this.addCommand({
			id: 'open-notification-dashboard',
			name: 'Open Notification Dashboard',
			callback: async () => await this.activateView()
		})
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
		const { vault } = this.app;

		const content = await vault.cachedRead(file);
		const tags = this.fileStructure.extractTagsFromMarkdown(content);

		try {
			const note = {
				title: file.name,
				location: file.path,
				reviewed: false,
				last_reviewed: new Date().toISOString(),
				tags
			} as Note;

			await this.db.upsertNotification(note);
			await this.fileStructure.init();

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
			const view = bookmarkLeaf.view as BookmarkedNotificationView;
			await view.reloadData();
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
}
