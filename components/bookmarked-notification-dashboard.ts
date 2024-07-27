import { DB } from "service/db";
import { ItemView, WorkspaceLeaf } from "obsidian";
import { Note } from "main";
import { NotificationComponent } from "./notification";
import { dashboardStyle } from '../constants';

export const VIEW_TYPE_BOOKMARKED_DASHBOARD = 'bookmarked-dashboard-view';

export class BookmarkedNotificationView extends ItemView {
	private notifications: NotificationComponent[];
	private notes: Note[] = [];
	private db: DB;

	constructor(leaf: WorkspaceLeaf, notes: Note[], db: DB) {
		super(leaf);
		this.notes = notes;
		this.notifications = []
		this.db = db;
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

		// Add a style block for custom styles
		const style = document.createElement('style');
		style.textContent = dashboardStyle;

		document.head.appendChild(style);

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
