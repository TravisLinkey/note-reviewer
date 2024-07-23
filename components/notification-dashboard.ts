import { DB } from 'service/db';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Note } from 'controllers/notes';
import { NotificationComponent } from './notification';
import { dashboardStyle } from '../constants';
import { notifications } from 'service/mock-notes';

export const VIEW_TYPE_NOTIFICATION_DASHBOARD = 'notification-dashboard-view';

export class NotificationDashboardView extends ItemView {
	private notes: Note[] = [];
	private notifications: NotificationComponent[];
	private selectAllCheckboxEl: HTMLInputElement;
	private db: DB;

	constructor(leaf: WorkspaceLeaf, notes: Note[], db: DB) {
		super(leaf);
		this.notes = notes;
		this.notifications = [];
		this.db = db;
	}

	getViewType(): string {
		return VIEW_TYPE_NOTIFICATION_DASHBOARD;
	}

	getDisplayText(): string {
		return "Notification Dashboard";
	}

	async onOpen() {
		this.initUI();
	}

	async onClose() {
		const { contentEl } = this;

		contentEl.empty();
	}

	initUI() {
		const notificationsContainer = this.containerEl.querySelector('.notification-dashboard');
		if (notificationsContainer) {
			notificationsContainer.remove();
		}

		const { contentEl } = this;

		// Add a style block for custom styles
		const style = document.createElement('style');
		style.textContent = dashboardStyle;
		document.head.appendChild(style);

		// Main container
		const container = contentEl.createEl('div', { cls: 'notification-dashboard' });

		// Create "Fetch" button
		const fetchButton = container.createEl('button', { text: 'Fetch' });
		fetchButton.addClass('button-margin');
		fetchButton.addEventListener('click', () => this.fetchMoreNotifications());

		// Header
		const headerEl = container.createEl('div', { cls: 'notification-header' });

		// Select All Checkbox
		this.selectAllCheckboxEl = headerEl.createEl('input', { type: 'checkbox', cls: 'all-notification-checkbox' });
		this.selectAllCheckboxEl.addEventListener('change', () => this.toggleSelectAll());

		// Title Label
		headerEl.createEl('div', { text: 'Select all', cls: 'notification-title' });

		// Done Button
		const doneHeaderButton = headerEl.createEl('button', { text: 'Done', cls: 'notification-button done-header-button' });
		doneHeaderButton.addEventListener('click', () => {
			this.markAllDone();
		});


		// Add notifications to the container
		this.notes.forEach((notification: Note) => {
			const elem = new NotificationComponent(this.app, container, notification, this.db);
			this.notifications.push(elem);
		});

	}

	async fetchMoreNotifications() {
		this.notes = await this.db.getUnreviewedNotifications();
		this.initUI();
	}

	toggleSelectAll() {
		try {
			if (this.selectAllCheckboxEl) {
				const isChecked = this.selectAllCheckboxEl.checked;
				this.notifications.forEach((notification: NotificationComponent) => {
					notification.setCheckboxState(isChecked);
				});
				this.updateDoneButtonVisibility();
			}
		} catch (error) {
			console.log("Toggle Select All: ", error);
		}
	}


	async markAllDone() {
		const allIds: string[] = [];

		try {
			this.notifications.map((notification: NotificationComponent) => {
				if (notification && notification.isChecked()) {
					allIds.push(notification.notification.id);
					notification.notificationEl.remove();
				}
			})
			const updatePromises = allIds.map(async (id: string) => {
				await this.db.patchNotification(id);
			});

			await Promise.all(updatePromises);
		} catch (error) {
			console.log("Mark all done: ", error)
		}

		// await this.db.test();
	}

	updateDoneButtonVisibility() {
		const checkboxes = this.contentEl.querySelectorAll('.notification-checkbox:checked');
		const doneHeaderButton = this.contentEl.querySelector('.done-header-button');
		if (doneHeaderButton) {
			if (checkboxes.length > 0) {
				doneHeaderButton.classList.add('visible');
			} else {
				doneHeaderButton.classList.remove('visible');
			}
		}
	}
}

