import { App, Component, TFile } from 'obsidian';

interface Notification {
	title: string;
	path: string;
}

export class NotificationComponent extends Component {
	private app: App;
	private notification: Notification;
	private container: HTMLElement;
	private buttonsContainer: HTMLElement;

	constructor(app: App, container: HTMLElement, notification: Notification) {
		super();
		this.app = app;
		this.notification = notification;
		this.container = container;
		this.render();
	}

	render() {

		const notificationEl = this.container.createEl('div', { cls: 'notification' });

		const checkboxEl = notificationEl.createEl('input', { type: 'checkbox', cls: 'notification-checkbox' });
		const titleEl = notificationEl.createEl('div', { cls: 'notification-title', text: this.notification.title });

		this.buttonsContainer = notificationEl.createEl('div', { cls: 'notification-buttons-container' });

		// View Button (Eye Icon)
		const viewButton = this.createIconButton('M12 4.5c-7.8 0-12 7.5-12 7.5s4.2 7.5 12 7.5 12-7.5 12-7.5-4.2-7.5-12-7.5zm0 13c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6zm0-10.5c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5 4.5-2 4.5-4.5-2-4.5-4.5-4.5z', 'View', this.openNote.bind(this));
		this.buttonsContainer.appendChild(viewButton);

		// Done Button (Check Icon)
		const doneButton = this.createIconButton('M10 20l-5.293-5.293 1.414-1.414L10 17.172l8.879-8.879 1.414 1.414z', 'Done', () => this.markDone(notificationEl));
		this.buttonsContainer.appendChild(doneButton);

		// Bookmark Button (Bookmark Icon)
		const bookmarkButton = this.createIconButton('M6 4c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v18l-7-3-7 3V4z', 'Bookmark', this.bookmarkNote.bind(this));
		this.buttonsContainer.appendChild(bookmarkButton);

		// Add event listeners for highlighting
		notificationEl.addEventListener('mouseenter', () => {
			notificationEl.classList.add('highlighted');
			this.buttonsContainer.style.display = 'flex';
		});

		notificationEl.addEventListener('mouseleave', () => {
			notificationEl.classList.remove('highlighted');
			this.buttonsContainer.style.display = 'none';
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
		const file = this.app.vault.getAbstractFileByPath(this.notification.path);
		if (file instanceof TFile) {
			this.app.workspace.getLeaf(true).openFile(file, { state: { mode: 'preview' } });
		} else {
			console.error(`File not found: ${this.notification.path}`);
		}
	}

	markDone(notificationEl: HTMLElement) {
		notificationEl.remove();
	}

	bookmarkNote() {
		console.log(`Bookmarking note: ${this.notification.title}`);
	}
}
