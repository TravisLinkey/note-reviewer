import NotificationDashboardPlugin, { Note } from 'main';
import { DB } from 'service/db';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { NotificationComponent } from './notification';
import { Tag } from '../main';

export const VIEW_TYPE_NOTIFICATION_DASHBOARD = 'notification-dashboard-view';

export class NotificationDashboardView extends ItemView {
	private allTags: string[];
	private db: DB;
	private dropdownMenu: HTMLSelectElement;
	private notes: Note[] = [];
	private notifications: NotificationComponent[];
	private plugin: NotificationDashboardPlugin;
	private resultsLimit: number;
	private selectAllCheckboxEl: HTMLInputElement;
	private selectedTag: string;
	private selectedTagLabel: HTMLSpanElement;

	constructor(leaf: WorkspaceLeaf, db: DB, plugin: NotificationDashboardPlugin) {
		super(leaf);
		this.allTags = [];
		this.db = db;
		this.notes = [];
		this.notifications = [];
		this.plugin = plugin
		this.resultsLimit = 10;
		this.selectedTag = "None";
	}

	getViewType(): string {
		return VIEW_TYPE_NOTIFICATION_DASHBOARD;
	}

	getDisplayText(): string {
		return "Notification Dashboard";
	}

	async onOpen() {
		await this.reloadData();
	}

	async onClose() {
		const { contentEl } = this;

		contentEl.empty();
	}

	initUI() {
		const notificationsContainer = this.containerEl.querySelector('.notification-container');
		if (notificationsContainer) {
			notificationsContainer.remove();
		}

		const { contentEl } = this;

		// Main container
		const container = contentEl.createEl('div', { cls: 'notification-container' });
		const buttonContainer = container.createEl('div', { cls: 'button-container' });
		const leftButtonGroup = buttonContainer.createEl('div', { cls: 'left-button-group' });

		// "Fetch" button
		const fetchButton = leftButtonGroup.createEl('button', { text: 'Fetch', cls: 'fetch-button' });
		fetchButton.addEventListener('click', () => this.fetchMoreNotifications());

		// Create a container for the dropdown button and menu
		const dropdownContainer = leftButtonGroup.createEl('div', { cls: 'dropdown-container' });

		const resultsLimitDropdown = leftButtonGroup.createEl('select', { cls: 'button-margin' });
		const limits = [5, 10, 15, 20, 50, 100];
		limits.forEach((limit: number, index: number) => {
			if (index == 0) {
				resultsLimitDropdown.createEl('option', { text: `Limit` });
			}
			resultsLimitDropdown.createEl('option', { text: `${limit} results`, value: limit.toString() });
		})
		resultsLimitDropdown.addEventListener('change', (event) => {
			this.resultsLimit = parseInt((event.target as HTMLSelectElement).value, 10);
		})

		// Create "Tags" dropdown button
		this.dropdownMenu = dropdownContainer.createEl('select', { text: this.selectedTag, cls: 'button-margin' });

		// Create a label for the selected tag
		this.selectedTagLabel = leftButtonGroup.createEl('span', { text: `Selected Tag: ${this.selectedTag}`, cls: 'selected-tag-label' });

		// Populate dropdown menu with tags
		this.allTags.forEach((tag: string, index: number) => {
			if (index == 0) {
				this.dropdownMenu.createEl('option', { text: `Filter` });
			}
			this.dropdownMenu.createEl('option', { text: tag });
		});
		this.dropdownMenu.addEventListener('change', (event) => {
			this.selectedTag = (event.target as HTMLSelectElement).value;
		});

		// "Bookmark" button
		const bookmarkButton = buttonContainer.createEl('button', { text: 'Show Bookmarked', cls: 'custom-button' });
		bookmarkButton.addEventListener('click', () => this.showBookmarkedNotifications());

		// Header
		const headerEl = container.createEl('div', { cls: 'flex-container' });

		const leftSide = headerEl.createEl('div', { cls: 'left-side' })

		// Select All Checkbox
		this.selectAllCheckboxEl = leftSide.createEl('input', { type: 'checkbox', cls: 'all-notification-checkbox' });
		this.selectAllCheckboxEl.addEventListener('change', () => this.toggleSelectAll());

		// Title Label
		leftSide.createEl('div', { text: 'Select all', cls: 'title-label' });

		// Done Button
		const doneHeaderButton = headerEl.createEl('button', { text: 'Done', cls: 'done-header-button' });
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
		if (this.selectedTag !== "Filter" && this.selectedTag !== "None") {
			this.notes = await this.filterNotificationsByTag(this.selectedTag);
		} else {
			this.notes = await this.db.getUnreviewedNotifications(15, this.resultsLimit);
		}

		this.initUI();
	}

	async filterNotificationsByTag(tag: string) {
		this.selectedTagLabel.textContent = `Selected Tag: ${tag}`;
		return this.db.getNotificationByTag(tag, this.resultsLimit);
	}

	async markAllDone() {
		const allTitles: string[] = [];

		try {
			this.notifications.map((notification: NotificationComponent) => {
				if (notification && notification.isChecked()) {
					allTitles.push(notification.notification.location);
					notification.notificationEl.remove();
				}
			})
			const updatePromises = allTitles.map(async (title: string) => {
				await this.db.patchNotification(title);
			});

			await Promise.all(updatePromises);
		} catch (error) { }
	}

	async reloadData() {
		this.notes = await this.db.getAllNotifications();
		this.allTags = await this.db.getAllTags();
		this.initUI();
	}

	showBookmarkedNotifications() {
		this.plugin.showBookmarkedNotifications();
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
			console.error("Toggle Select All: ", error);
		}
	}

	updateDoneButtonVisibility() {
		const checkboxes = this.contentEl.querySelectorAll('.notification-checkbox:checked');
		const doneHeaderButton = this.contentEl.querySelector('.done-header-button');
		if (doneHeaderButton) {
			if (checkboxes.length < 1) {
				doneHeaderButton.classList.add('hidden');
			} else {
				doneHeaderButton.classList.remove('hidden');
			}
		}
	}
}

