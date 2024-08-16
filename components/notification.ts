import { App, Component, TFile } from 'obsidian';
import { DB } from 'service/db';
import { Note } from 'main';
import { createIcon, bookmarkIcon, viewIcon } from '../constants/index';

export class NotificationComponent extends Component {
	private app: App;
	private buttonsContainer: HTMLElement;
	private container: HTMLElement;
	public notification: Note;
	public notificationEl: HTMLElement;
	private db: DB;

	private checkboxEl: HTMLInputElement;

	constructor(app: App, container: HTMLElement, notification: Note, db: DB) {
		super();
		this.app = app;
		this.notification = notification;
		this.container = container;
		this.db = db;

		this.render();
	}

	render() {

		const notificationEl = this.container.createEl('div', { cls: 'notification-flex-container' });
		this.notificationEl = notificationEl;

		const leftColumn = this.notificationEl.createEl('div', { cls: 'column notification-left-column' });
		const middleColumn = this.notificationEl.createEl('div', { cls: 'column notification-middle-column' });
		const rightColumn = this.notificationEl.createEl('div', { cls: 'column notification-right-column' });

		this.checkboxEl = leftColumn.createEl('input', { type: 'checkbox', cls: 'notification-checkbox' });
		const clippedTitle = this.notification.title.length < 30 ? this.notification.title : this.notification.title.slice(0, 27) + "...";
		const titleEl = leftColumn.createEl('div', { cls: 'notification-title', text: clippedTitle });
		titleEl.addEventListener('click', this.openNote.bind(this));

		// Last Reviewed Label
		const lastReviewedEl = middleColumn.createEl('div', { cls: 'notification-last-reviewed' });
		lastReviewedEl.textContent = `${new Date(this.notification.last_reviewed).toLocaleDateString()}`;

		// Buttons
		this.buttonsContainer = rightColumn.createEl('div', { cls: 'column notification-right-column' });
		const buttons = this.buttonsContainer.createEl("div", { cls: 'notification-button-container' })
		const viewButton = this.createIconButton(viewIcon, 'View', this.openNote.bind(this));
		const doneButton = this.createIconButton(createIcon, 'Done', () => this.markDone());
		const bookmarkButton = this.createIconButton(bookmarkIcon, 'Bookmark', this.bookmarkNote.bind(this));
		buttons.appendChild(viewButton);
		buttons.appendChild(doneButton);
		buttons.appendChild(bookmarkButton);
		buttons.classList.add('hidden');

		// Add event listeners for highlighting
		this.notificationEl.addEventListener('mouseenter', () => {
			buttons.classList.remove('hidden');
			this.notificationEl.classList.add('highlighted');
		});
		this.notificationEl.addEventListener('mouseleave', () => {
			buttons.classList.add('hidden');
			this.notificationEl.classList.remove('highlighted');
		});
	}

	createIconButton(pathData: string, ariaLabel: string, clickHandler: () => void): HTMLElement {
		const button = document.createElement('button');
		button.classList.add('notification-button');
		button.setAttribute('aria-label', ariaLabel);

		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('width', '16');
		svg.setAttribute('height', '16');
		svg.setAttribute('fill', 'white'); // Set fill color to white

		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', pathData);

		svg.appendChild(path);
		button.appendChild(svg);

		button.addEventListener('click', clickHandler);

		return button;
	}


	openNote() {
		const file = this.app.vault.getAbstractFileByPath(this.notification.location);
		if (file instanceof TFile) {
			this.app.workspace.getLeaf(true).openFile(file, { state: { mode: 'preview' } });
		} else {
			console.error(`File not found: ${this.notification.location}`);
		}
	}

	async markDone() {
		await this.db.patchNotification(this.notification.location);
		this.notificationEl.remove();
	}

	async bookmarkNote() {
		await this.db.bookmarkNotification(this.notification.title);
	}

	setCheckboxState(isChecked: boolean) {
		this.checkboxEl.checked = isChecked;
	}

	isChecked() {
		try {
			return this.checkboxEl.checked;
		} catch (error) {}
	}
}
