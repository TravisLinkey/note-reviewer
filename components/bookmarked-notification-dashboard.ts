import { DB } from "service/db";
import { ItemView, WorkspaceLeaf } from "obsidian";
import { Note } from "main";
import { NotificationComponent } from "./notification";
export const VIEW_TYPE_BOOKMARKED_DASHBOARD = 'bookmarked-dashboard-view';

export class BookmarkedNotificationView extends ItemView {
	private notifications: NotificationComponent[];
	private notes: Note[] = [];
	private db: DB;

	constructor(leaf: WorkspaceLeaf, db: DB) {
		super(leaf);
		this.notes = [];
		this.notifications = []
		this.db = db;
	}

	async reloadData() {
		this.notes = await this.db.getBookmarkedNotifications();
		await this.initUI();
	}

	getViewType(): string {
		return VIEW_TYPE_BOOKMARKED_DASHBOARD;
	}

	getDisplayText(): string {
		return 'Bookmarked Notifications';
	}

	async onOpen() {
		await this.initUI();
	}

	async onClose() {
		const { contentEl } = this;

		contentEl.empty();
	}

	async initUI() {
		const { contentEl } = this;

		// Main container
		const container = contentEl.createEl('div', { cls: 'bookmark-dashboard' });

		// Fetch and render bookmarked notifications
		this.notes = await this.db.getBookmarkedNotifications();

		// Add notifications to the container
		this.notes.forEach((notification: Note) => {
			const elem = new NotificationComponent(this.app, container, notification, this.db);
			this.notifications.push(elem);
		});
	}
}
