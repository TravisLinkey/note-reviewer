import NotificationDashboardPlugin, { Note } from 'main';
import { DB } from 'service/db';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { NotificationComponent } from './notification';

export const VIEW_TYPE_NOTIFICATION_DASHBOARD = 'notification-dashboard-view';

export class NotificationDashboardView extends ItemView {
	private allTags: string[];
	private db: DB;
	private dropdownContainer: HTMLDivElement;
	private dropdownInput: HTMLInputElement;
	private autocompleteMenu: HTMLDivElement;
	private notes: Note[] = [];
	private notifications: NotificationComponent[];
	private plugin: NotificationDashboardPlugin;
	private resultsLimit: number;
	private selectAllCheckboxEl: HTMLInputElement;
	private selectedTag: string;
	private selectedTagLabel: HTMLSpanElement;
	private filteredTags: string[] = [];
	private sortField: string = 'last_reviewed';
	private sortDirection: 'asc' | 'desc' = 'asc';

	constructor(leaf: WorkspaceLeaf, db: DB, plugin: NotificationDashboardPlugin) {
		super(leaf);
		this.allTags = [];
		this.db = db;
		this.notes = [];
		this.notifications = [];
		this.plugin = plugin
		this.resultsLimit = 50;
		this.selectedTag = "None";
		this.filteredTags = [];
	}

	getViewType(): string {
		return VIEW_TYPE_NOTIFICATION_DASHBOARD;
	}

	getDisplayText(): string {
		return "Notification Dashboard";
	}

	async onOpen() {
		await this.loadPage();
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
		// const centerLabel = container.createEl('div', { cls: 'last-reviewed' });
		// centerLabel.createEl('span', { text: "Last Reviewed" });

		// "Fetch" button
		const fetchButton = leftButtonGroup.createEl('button', { text: 'Fetch', cls: 'fetch-button' });
		fetchButton.addEventListener('click', () => this.fetchMoreNotifications());

		// Create a container for the dropdown button and menu
		this.dropdownContainer = leftButtonGroup.createEl('div', { cls: 'dropdown-container' });

		const resultsLimitDropdown = leftButtonGroup.createEl('select', { cls: 'button-margin' });
		const limits = [5, 10, 15, 20, 50, 100];
		limits.forEach((limit: number) => {
			if (limit === 50) {
				resultsLimitDropdown.createEl('option', { text: `Limit - ${limit}`, value: limit.toString() });
			} else {
				resultsLimitDropdown.createEl('option', { text: `${limit} results`, value: limit.toString() });
			}
		})
		resultsLimitDropdown.value = "50"; // Set default selected value
		resultsLimitDropdown.addEventListener('change', (event) => {
			this.resultsLimit = parseInt((event.target as HTMLSelectElement).value, 10);
		})

		// Create a label for the selected tag
		const selectedTagWrapper = leftButtonGroup.createEl('span', { cls: 'selected-tag-wrapper' });
		this.selectedTagLabel = selectedTagWrapper.createEl('span', { text: `Selected Tag: ${this.selectedTag}`, cls: 'selected-tag-label' });

		// Add remove tag badge/button
		const removeTagBtn = selectedTagWrapper.createEl('span', { text: '×', cls: 'remove-tag-badge', title: 'Remove tag filter' });
		removeTagBtn.style.cursor = 'pointer';
		removeTagBtn.style.marginLeft = '6px';
		removeTagBtn.style.fontWeight = 'bold';
		removeTagBtn.style.color = 'var(--text-faint)';
		removeTagBtn.addEventListener('mouseenter', () => removeTagBtn.style.color = 'var(--text-normal)');
		removeTagBtn.addEventListener('mouseleave', () => removeTagBtn.style.color = 'var(--text-faint)');
		removeTagBtn.addEventListener('click', async () => {
			this.selectedTag = "None";
			this.selectedTagLabel.textContent = `Selected Tag: ${this.selectedTag}`;
			this.dropdownInput.value = '';
			this.autocompleteMenu.style.display = 'none';
			this.filteredTags = [];
			// Show all notes (not filtered)
			this.notes = await this.db.getAllNotifications();
			this.initUI();
		});

		// Create autocomplete input for tags
		this.dropdownInput = this.dropdownContainer.createEl('input', { 
			type: 'text', 
			cls: 'button-margin autocomplete-input',
			placeholder: 'Search tags...'
		});

		// Create autocomplete dropdown menu
		this.autocompleteMenu = this.dropdownContainer.createEl('div', { cls: 'autocomplete-menu' });
		this.autocompleteMenu.style.display = 'none';

		// Add event listeners for autocomplete
		this.setupAutocomplete();

		// Create a right-aligned button group for Bookmarked and Done
		const rightButtonGroup = buttonContainer.createEl('div', { cls: 'right-button-group' });
		rightButtonGroup.style.display = 'flex';
		rightButtonGroup.style.justifyContent = 'flex-end';
		rightButtonGroup.style.gap = '0';
		rightButtonGroup.style.marginLeft = 'auto';

		const bookmarkButton = rightButtonGroup.createEl('button', { text: 'Show Bookmarked', cls: 'custom-button' });
		bookmarkButton.addEventListener('click', () => this.showBookmarkedNotifications());

		const doneHeaderButton = rightButtonGroup.createEl('button', { text: 'Done', cls: 'done-header-button' });
		doneHeaderButton.addEventListener('click', () => {
			this.markAllDone();
		});

		// Header
		const headerEl = container.createEl('div', { cls: 'notification-flex-container bottom-border' });
		const leftColumn = headerEl.createEl('div', { cls: 'column notification-left-column' })
		headerEl.createEl('div', { cls: 'notification-divider' });
		const middleColumn = headerEl.createEl('div', { cls: 'column notification-middle-column' })
		const rightColumn = headerEl.createEl('div', { cls: 'column notification-right-column' })

		// Select All Checkbox
		this.selectAllCheckboxEl = leftColumn.createEl('input', { type: 'checkbox', cls: 'all-notification-checkbox' });
		this.selectAllCheckboxEl.addEventListener('change', () => this.toggleSelectAll());

		// Title Label
		leftColumn.createEl('div', { text: 'Select all', cls: 'title-label' });

		// Name Column with sorting
		const nameHeader = middleColumn.createEl('div', { text: 'Name', cls: 'sortable-header' });
		nameHeader.style.cursor = 'pointer';
		nameHeader.addEventListener('click', () => this.sortByField('title'));
		this.updateSortIndicator(nameHeader, 'title');

		// Last Reviewed Column with sorting
		const lastReviewedHeader = rightColumn.createEl('div', { text: 'Last reviewed', cls: 'sortable-header' });
		lastReviewedHeader.style.cursor = 'pointer';
		lastReviewedHeader.addEventListener('click', () => this.sortByField('last_reviewed'));
		this.updateSortIndicator(lastReviewedHeader, 'last_reviewed');

		// Add notifications to the container
		const sortedNotes = this.getSortedNotes();
		sortedNotes.forEach((notification: Note) => {
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

	reloadDropdown() {
		// Clear the input and reset the autocomplete
		this.dropdownInput.value = '';
		this.selectedTag = "None";
		this.selectedTagLabel.textContent = `Selected Tag: ${this.selectedTag}`;
		this.autocompleteMenu.style.display = 'none';
		this.filteredTags = [];
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

	async loadPage() {
		console.log("DEBUG: loadPage - Starting to load dashboard");
		
		try {
			this.notes = await this.db.getAllNotifications();
			console.log("DEBUG: loadPage - Loaded", this.notes.length, "notes from database");
			
			this.allTags = await this.db.getAllTags();
			console.log("DEBUG: loadPage - Loaded", this.allTags.length, "tags from database");
			
			this.initUI();
			console.log("DEBUG: loadPage - Dashboard UI initialized");
		} catch (error) {
			console.error("DEBUG: loadPage - Error loading dashboard:", error);
		}
	}

	async loadDropdown() {
		this.notes = await this.db.getAllNotifications();
		this.allTags = await this.db.getAllTags();
		
		 this.reloadDropdown();
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

	setupAutocomplete() {
		// Input event - filter tags as user types
		this.dropdownInput.addEventListener('input', (event) => {
			const inputValue = (event.target as HTMLInputElement).value.toLowerCase();
			this.filterTags(inputValue);
		});

		// Focus event - show all tags when input is focused
		this.dropdownInput.addEventListener('focus', () => {
			this.filterTags('');
		});

		// Blur event - hide dropdown after a short delay
		this.dropdownInput.addEventListener('blur', () => {
			setTimeout(() => {
				this.autocompleteMenu.style.display = 'none';
			}, 200);
		});

		// Keyboard navigation
		this.dropdownInput.addEventListener('keydown', (event) => {
			const visibleItems = this.autocompleteMenu.querySelectorAll('.autocomplete-item');
			const currentIndex = Array.from(visibleItems).findIndex(item => 
				item.classList.contains('selected')
			);

			switch (event.key) {
				case 'ArrowDown':
					event.preventDefault();
					this.navigateAutocomplete(currentIndex, 1, visibleItems);
					break;
				case 'ArrowUp':
					event.preventDefault();
					this.navigateAutocomplete(currentIndex, -1, visibleItems);
					break;
				case 'Enter':
					event.preventDefault();
					if (currentIndex >= 0) {
						this.selectTag(this.filteredTags[currentIndex]);
					}
					break;
				case 'Escape':
					this.autocompleteMenu.style.display = 'none';
					break;
			}
		});
	}

	filterTags(inputValue: string) {
		this.filteredTags = this.allTags.filter(tag => 
			tag.toLowerCase().includes(inputValue)
		);

		this.updateAutocompleteMenu();
	}

	updateAutocompleteMenu() {
		this.autocompleteMenu.innerHTML = '';

		if (this.filteredTags.length === 0) {
			this.autocompleteMenu.style.display = 'none';
			return;
		}

		// Show all filtered tags (no limit)
		const displayTags = this.filteredTags;

		displayTags.forEach((tag, index) => {
			const item = this.autocompleteMenu.createEl('div', {
				cls: 'autocomplete-item',
				text: tag
			});

			// Mouse events
			item.addEventListener('mouseenter', () => {
				this.autocompleteMenu.querySelectorAll('.autocomplete-item').forEach(el =>
					el.classList.remove('selected')
				);
				item.classList.add('selected');
			});

			item.addEventListener('click', () => {
				this.selectTag(tag);
			});

			// Select first item by default
			if (index === 0) {
				item.classList.add('selected');
			}
		});

		this.autocompleteMenu.style.display = 'block';
	}

	navigateAutocomplete(currentIndex: number, direction: number, visibleItems: NodeListOf<Element>) {
		const newIndex = Math.max(0, Math.min(currentIndex + direction, visibleItems.length - 1));
		
		visibleItems.forEach(item => item.classList.remove('selected'));
		visibleItems[newIndex].classList.add('selected');
	}

	selectTag(tag: string) {
		this.selectedTag = tag;
		this.dropdownInput.value = tag;
		this.selectedTagLabel.textContent = `Selected Tag: ${tag}`;
		this.autocompleteMenu.style.display = 'none';
		
		// Trigger the filter
		this.filterNotificationsByTag(tag);
	}

	sortByField(field: string) {
		if (this.sortField === field) {
			this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			this.sortField = field;
			this.sortDirection = 'asc';
		}
		
		// Sort the notes
		this.notes.sort((a, b) => {
			let aValue = a[field as keyof Note];
			let bValue = b[field as keyof Note];
			
			// Handle string comparison for title
			if (typeof aValue === 'string' && typeof bValue === 'string') {
				aValue = aValue.toLowerCase();
				bValue = bValue.toLowerCase();
			}
			
			if (aValue < bValue) {
				return this.sortDirection === 'asc' ? -1 : 1;
			}
			if (aValue > bValue) {
				return this.sortDirection === 'asc' ? 1 : -1;
			}
			return 0;
		});
		
		this.initUI();
	}

	getSortedNotes(): Note[] {
		return [...this.notes].sort((a, b) => {
			let aValue = a[this.sortField as keyof Note];
			let bValue = b[this.sortField as keyof Note];
			
			// Handle string comparison for title
			if (typeof aValue === 'string' && typeof bValue === 'string') {
				aValue = aValue.toLowerCase();
				bValue = bValue.toLowerCase();
			}
			
			if (aValue < bValue) {
				return this.sortDirection === 'asc' ? -1 : 1;
			}
			if (aValue > bValue) {
				return this.sortDirection === 'asc' ? 1 : -1;
			}
			return 0;
		});
	}

	updateSortIndicator(header: HTMLDivElement, field: string) {
		// Remove existing sort icon
		const existingIcon = header.querySelector('.sort-icon');
		if (existingIcon) {
			existingIcon.remove();
		}

		// Add sort icon if this is the current sort field
		if (this.sortField === field) {
			const icon = document.createElement('span');
			icon.className = 'sort-icon';
			icon.textContent = this.sortDirection === 'asc' ? ' ↑' : ' ↓';
			icon.style.marginLeft = '4px';
			icon.style.fontWeight = 'bold';
			header.appendChild(icon);
		}
	}
}

