import NotificationDashboardPlugin from 'main';
import { DB } from 'service/db';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Note } from 'controllers/notes';
import { NotificationComponent } from './notification';
import { Tag } from '../main';
import { dashboardStyle } from '../constants';

export const VIEW_TYPE_NOTIFICATION_DASHBOARD = 'notification-dashboard-view';

export class NotificationDashboardView extends ItemView {
	private allTags: string[];
	private db: DB;
	private dropdownMenu: HTMLDivElement;
	private notes: Note[] = [];
	private notifications: NotificationComponent[];
	private plugin: NotificationDashboardPlugin;
	private selectAllCheckboxEl: HTMLInputElement;
	private selectedTag: string;
	private selectedTagLabel: HTMLSpanElement;

	constructor(leaf: WorkspaceLeaf, notes: Note[], db: DB, plugin: NotificationDashboardPlugin) {
		super(leaf);
		this.db = db;
		this.notes = notes;
		this.notifications = [];
		this.allTags = [];
		this.plugin = plugin
		this.selectedTag = "None";
	}

	getViewType(): string {
		return VIEW_TYPE_NOTIFICATION_DASHBOARD;
	}

	getDisplayText(): string {
		return "Notification Dashboard";
	}

	async onOpen() {
		const tags = await this.db.getAllTags();

		tags.map((tag: Tag) => {
			// @ts-ignore
			const t = tag.toJSON();
			this.allTags.push(t.title);
		})

		console.log('ALL TAGS: ', this.allTags.sort());
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

		// "Fetch" button
		const fetchButton = container.createEl('button', { text: 'Fetch' });
		fetchButton.addClass('button-margin');
		fetchButton.addEventListener('click', () => this.fetchMoreNotifications());

		// "Bookmark" button
		const bookmarkButton = container.createEl('button', { text: 'Show Bookmarked' });
		bookmarkButton.addClass('button-margin');
		bookmarkButton.addEventListener('click', () => this.showBookmarkedNotifications());

		// Create a container for the dropdown button and menu
		const dropdownContainer = container.createEl('div', { cls: 'dropdown-container' });
		dropdownContainer.style.position = 'relative';
		dropdownContainer.style.display = 'inline-block';
		dropdownContainer.style.marginBottom = '10px'; // Adjust the margin size as needed

		// Create "Tags" dropdown button
		const dropdownButton = dropdownContainer.createEl('button', { text: 'Filter' });
		dropdownButton.style.marginLeft = '5px';

		// Create the dropdown menu container
		this.dropdownMenu = dropdownContainer.createEl('div', { cls: 'dropdown-menu' });

		// Create a label for the selected tag
		this.selectedTagLabel = container.createEl('span', { text: `Selected Tag: ${this.selectedTag}` });
		this.selectedTagLabel.style.marginLeft = '10px';
		this.selectedTagLabel.style.display = 'inline-block';
		this.selectedTagLabel.style.verticalAlign = 'middle';

		// Populate dropdown menu with tags
		this.allTags.forEach((tag: string) => {
			const tagItem = this.dropdownMenu.createEl('div', { text: tag, cls: 'dropdown-item' });
			tagItem.addEventListener('click', () => {
				this.filterNotificationsByTag(tag);
			});
		});

		// Toggle dropdown visibility
		dropdownButton.addEventListener('click', () => {
			this.dropdownMenu.style.display = this.dropdownMenu.style.display === 'none' ? 'block' : 'none';
		});

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

	async filterNotificationsByTag(tag: string) {
		console.log("Tag: ", tag);
		this.selectedTag = tag;
		this.dropdownMenu.style.display = 'none';
		this.selectedTagLabel.textContent = `Selected Tag: ${tag}`;

		// TODO - get the relevant notifications
		this.notes = await this.db.getNotificationByTag(tag);
		this.initUI();
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
	}

	showBookmarkedNotifications() {
		console.log("SHOWING BOOKMARKS");
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
			console.log("Toggle Select All: ", error);
		}
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

