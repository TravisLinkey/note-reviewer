import { DB } from "service/db";
import { FileStructureState } from "service/file-structure-state";
import { NotificationDashboardView, VIEW_TYPE_NOTIFICATION_DASHBOARD } from "components/notification-dashboard";
import { Plugin, WorkspaceLeaf } from "obsidian"
import { QueueStorage } from "service/queue-storage";
import { BookmarkedNotificationView, VIEW_TYPE_BOOKMARKED_DASHBOARD } from "components/bookmarked-notification-dashboard";

export interface Note {
	id: string;
	title: string;
	location: string;
	reviewed: boolean;
	tracked: boolean;
	bookmarked: boolean;
	last_reviewed: string;
}

export default class NotificationDashboardPlugin extends Plugin {
	// private qs: QueueStorage;
	private db: DB;

	private notifications: Note[];
	private ribbonIconEl: HTMLElement;
	private basePath: string;
	private fileStructure: FileStructureState;

	async onload() {
		// @ts-ignore
		const obsidianRootDirectory = this.app.vault.adapter.basePath;
		this.basePath = obsidianRootDirectory + "/.obsidian/plugins/note-reviewer";

		this.ribbonIconEl = this.addRibbonIcon('bell', 'Open Notifications', async () => {
			await this.activateView()
		});
		this.ribbonIconEl.classList.add('badge-container');

		this.db = new DB();
		await this.db.init();

		// @ts-ignore
		this.fileStructure = new FileStructureState(obsidianRootDirectory, this.basePath, this.db);
		await this.fileStructure.init();

		await this.reloadView();
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
		await this.reloadView();
	}

	async reloadView() {
		await this.fileStructure.init();

		this.app.workspace.detachLeavesOfType(VIEW_TYPE_NOTIFICATION_DASHBOARD)

		this.notifications = await this.db.getUnreviewedNotifications(0, 100);
		console.log("Notifications: ", this.notifications);

		this.registerView(
			VIEW_TYPE_NOTIFICATION_DASHBOARD,
			(leaf: WorkspaceLeaf) => new NotificationDashboardView(leaf, this.notifications, this.db, this)
		)

		const bookmarkedNotifications = await this.db.getBookmarkedNotifications();
		this.registerView(
			VIEW_TYPE_BOOKMARKED_DASHBOARD,
			(leaf: WorkspaceLeaf) => new BookmarkedNotificationView(leaf, bookmarkedNotifications, this.db)
		)

		this.moveIconToBottom();

		// await this.updateBadge();

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

	// async updateBadge() {
	// 	const unreadCount = await this.qs.getNotesCount();

	// 	if (unreadCount > 0) {
	// 		let badgeEl = this.ribbonIconEl.querySelector('.badge');
	// 		if (!badgeEl) {
	// 			badgeEl = document.createElement('div');
	// 			badgeEl.className = 'badge';
	// 			this.ribbonIconEl.appendChild(badgeEl);
	// 		}
	// 		badgeEl.textContent = unreadCount < 10 ? unreadCount.toString() : "+";
	// 		badgeEl.classList.add('active');
	// 	} else {
	// 		const badgeEl = this.ribbonIconEl.querySelector('.badge');
	// 		if (badgeEl) {
	// 			badgeEl.classList.remove('active');
	// 		}
	// 	}
	// };
}
