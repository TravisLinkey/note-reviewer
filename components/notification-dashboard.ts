import { ItemView, WorkspaceLeaf } from 'obsidian';
import { NotificationComponent } from './notification';
import { Note } from 'controllers/notes';
import { QueueStorage } from 'service/queue-storage';
import { dashboardStyle } from '../constants';

export const VIEW_TYPE_NOTIFICATION_DASHBOARD = 'notification-dashboard-view';

export class NotificationDashboardView extends ItemView {
	private notes: Note[] = [];
	private notifications: NotificationComponent[];
	private qs: QueueStorage;
	private selectAllCheckboxEl: HTMLInputElement;

	constructor(leaf: WorkspaceLeaf, notes: Note[], qs: QueueStorage) {
		super(leaf);
		this.notes = notes;
		this.notifications  = [];
		this.qs = qs;
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
		const { contentEl } = this;

		// Add a style block for custom styles
		const style = document.createElement('style');
		style.textContent = dashboardStyle;
		document.head.appendChild(style);

		// Main container
		const container = contentEl.createEl('div', { cls: 'notification-dashboard' });

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
			const elem = new NotificationComponent(this.app, container, notification, this.qs);
			this.notifications.push(elem);
		});

	}

	toggleSelectAll() {
		const isChecked = this.selectAllCheckboxEl.checked;
		this.notifications.forEach((notification: NotificationComponent) => {
			notification.setCheckboxState(isChecked);
		});
		this.updateDoneButtonVisibility();
	}


	async markAllDone() {
		const allIds: string[] = [];

		this.notifications.map((notification: NotificationComponent) => {
			if (notification.isChecked()) {
				allIds.push(notification.notification.id);
				notification.notificationEl.remove();
			}
		})

		await this.qs.removeSelectedNotesFromStorage(allIds);
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

