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

		const notificationEl = this.container.createEl('div', { cls: 'notification' });
		this.notificationEl = notificationEl;

		this.checkboxEl = this.notificationEl.createEl('input', { type: 'checkbox', cls: 'notification-checkbox' });

		// Title
		const titleEl = this.notificationEl.createEl('div', { cls: 'notification-title', text: this.notification.title });
		titleEl.addEventListener('click', this.openNote.bind(this));

		// Last Reviewed Label
		const lastReviewedEl = notificationEl.createEl('div', { cls: 'notification-last-reviewed' });
		lastReviewedEl.textContent = `Last Reviewed: ${this.notification.last_reviewed}`;

		// Buttons
		this.buttonsContainer = this.notificationEl.createEl('div');
		const viewButton = this.createIconButton(viewIcon, 'View', this.openNote.bind(this));
		const doneButton = this.createIconButton(createIcon, 'Done', () => this.markDone());
		const bookmarkButton = this.createIconButton(bookmarkIcon, 'Bookmark', this.bookmarkNote.bind(this));
		this.buttonsContainer.appendChild(viewButton);
		this.buttonsContainer.appendChild(doneButton);
		this.buttonsContainer.appendChild(bookmarkButton);
		// Initially hide the buttons
		this.buttonsContainer.addClass('notification-buttons-container-hidden');

		// Add event listeners for highlighting
		this.notificationEl.addEventListener('mouseenter', () => {
			this.buttonsContainer.removeClass('notification-buttons-container-hidden');
			this.notificationEl.classList.add('highlighted');
		});
		this.notificationEl.addEventListener('mouseleave', () => {
			this.buttonsContainer.addClass('notification-buttons-container-hidden');
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
		await this.db.patchNotification(this.notification.title);
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
		} catch (error) {
			console.log("Is Checked: ", error)
		}
	}
}
