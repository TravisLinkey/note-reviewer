import { BookmarkedNotificationView, VIEW_TYPE_BOOKMARKED_DASHBOARD } from "components/bookmarked-notification-dashboard";
import { DB } from "service/db";
import { FileStructureState } from "service/file-structure-state";
import { NotificationDashboardView, VIEW_TYPE_NOTIFICATION_DASHBOARD } from "components/notification-dashboard";
import { Plugin, WorkspaceLeaf } from "obsidian"

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
	private ribbonIconEl: HTMLElement;

	async onload() {
		// @ts-ignore
		const obsidianRootDirectory = this.app.vault.adapter.basePath;
		this.basePath = obsidianRootDirectory + "/.obsidian/plugins/note-reviewer";

		this.db = new DB();
		await this.db.init();

		// @ts-ignore
		this.fileStructure = new FileStructureState(obsidianRootDirectory, this.basePath, this.db);

		await this.loadView();
	}

	async activateView() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_NOTIFICATION_DASHBOARD);

		await this.app.workspace.getLeaf(true).setViewState({
			type: VIEW_TYPE_NOTIFICATION_DASHBOARD,
			active: true
		});
		this.app.workspace.revealLeaf(this.app.workspace.getLeavesOfType(VIEW_TYPE_NOTIFICATION_DASHBOARD)[0]);
	}

	moveIconToBottom() {
		const ribbonContainer = document.querySelector('.workspace-ribbon') as HTMLElement;
		console.log("Moving icon to bottom.", ribbonContainer);

		if (ribbonContainer) {
			ribbonContainer.appendChild(this.ribbonIconEl);
		}
	}
	async onFileRenamed() {
		// TODO - get the notification leaf, reload the data
		const notificationLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_NOTIFICATION_DASHBOARD).first();
		if (notificationLeaf) {
			const view = notificationLeaf.view as NotificationDashboardView;

			await this.fileStructure.init();
			await view.reloadData();
		}

		const bookmarkLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOKMARKED_DASHBOARD).first();
		if (bookmarkLeaf) {
			// @ts-ignore
			const view = bookmarkLeaf.view as BookmarkedNotificationView;
			await this.fileStructure.init();
			await view.reloadData();
		}
	}

	async loadView() {
		await this.fileStructure.init();

		this.registerView(
			VIEW_TYPE_NOTIFICATION_DASHBOARD,
			(leaf: WorkspaceLeaf) => new NotificationDashboardView(leaf, this.db, this)
		)

		this.registerView(
			VIEW_TYPE_BOOKMARKED_DASHBOARD,
			(leaf: WorkspaceLeaf) => new BookmarkedNotificationView(leaf, this.db)
		)

		this.ribbonIconEl = this.addRibbonIcon('bell', 'Open Notifications', async () => {
			await this.activateView()
		});
		this.ribbonIconEl.classList.add('badge-container');

		// 	this.moveIconToBottom();
		// 	// await this.updateBadge();

		this.registerEvent(this.app.vault.on('rename', this.onFileRenamed.bind(this)))
		this.addCommand({
			id: 'open-notification-dashboard',
			name: 'Open Notification Dashboard',
			callback: () => {
				this.activateView();
			}
		})
	}

	async showBookmarkedNotifications() {
		const existingLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOKMARKED_DASHBOARD)[0];
		console.log("Existing leaf: ", existingLeaf);
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
