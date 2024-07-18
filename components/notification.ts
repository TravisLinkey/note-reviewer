import { createIcon, bookmarkIcon, viewIcon } from '../constants/index';
import { Note } from 'controllers/notes';
import { App, Component, TFile } from 'obsidian';
import { QueueStorage } from 'service/queue-storage';

export class NotificationComponent extends Component {
	private app: App;
	private buttonsContainer: HTMLElement;
	private container: HTMLElement;
	public notification: Note;
	public notificationEl: HTMLElement;
	private qs: QueueStorage;
	private checkboxEl: HTMLInputElement;

	constructor(app: App, container: HTMLElement, notification: Note, qs: QueueStorage) {
		super();
		this.app = app;
		this.notification = notification;
		this.container = container;
		this.qs = qs;
		this.render();
	}

	render() {

		this.notificationEl = this.container.createEl('div', { cls: 'notification' });

		this.checkboxEl = this.notificationEl.createEl('input', { type: 'checkbox', cls: 'notification-checkbox' });
		this.notificationEl.createEl('div', { cls: 'notification-title', text: this.notification.title }
		);

		// Buttons
		this.buttonsContainer = this.notificationEl.createEl('div', { cls: 'notification-buttons-container' });
		const viewButton = this.createIconButton(viewIcon, 'View', this.openNote.bind(this));
		const doneButton = this.createIconButton(createIcon, 'Done', () => this.markDone());
		const bookmarkButton = this.createIconButton(bookmarkIcon, 'Bookmark', this.bookmarkNote.bind(this));
		this.buttonsContainer.appendChild(viewButton);
		this.buttonsContainer.appendChild(doneButton);
		this.buttonsContainer.appendChild(bookmarkButton);

		// Add event listeners for highlighting
		this.notificationEl.addEventListener('mouseenter', () => {
			this.notificationEl.classList.add('highlighted');
			this.buttonsContainer.style.display = 'flex';
		});

		this.notificationEl.addEventListener('mouseleave', () => {
			this.notificationEl.classList.remove('highlighted');
			this.buttonsContainer.style.display = 'none';
		});

		this.notificationEl.addEventListener('click', (event) => {
			if (event.target !== this.checkboxEl) {
				this.checkboxEl.checked = !this.checkboxEl.checked;
				this.checkboxEl.dispatchEvent(new Event('change'));
			}
		});

		// Initially hide the buttons
		this.buttonsContainer.style.display = 'none';
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
		await this.qs.removeSelectedNotesFromStorage([this.notification.id]);
		this.notificationEl.remove();
	}

	bookmarkNote() {
		console.log(`Bookmarking note: ${this.notification.id}`);
	}

	setCheckboxState(isChecked: boolean) {
		this.checkboxEl.checked = isChecked;
	}

	isChecked() {
		const checkboxEl = this.container.querySelector('.notification-checkbox') as HTMLInputElement;
		return checkboxEl.checked;
	}
}
