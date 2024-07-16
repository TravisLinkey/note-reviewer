import { ItemView, WorkspaceLeaf } from 'obsidian';
import { NotificationComponent } from './notification';

export const VIEW_TYPE_NOTIFICATION_DASHBOARD = 'notification-dashboard-view';

export class NotificationDashboardView extends ItemView {
	notifications = [
		{
			title: 'Amazon Cognito',
			path: '0 - TODO/Amazon Cognito.md'
		},
		{
			title: 'Something_Again',
			path: '0 - TODO/Something_Again.md'
		},
		{
			title: 'TODO',
			path: '0 - TODO/TODO.md'
		}
	];

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_NOTIFICATION_DASHBOARD;
	}

	getDisplayText(): string {
		return "Notification Dashboard";
	}

	async onOpen() {
		const { contentEl } = this;

		// Add a style block for custom styles
		const style = document.createElement('style');
		style.textContent = `
		.notification-dashboard {
			padding: 20px;
		}
		.notification-header {
			display: flex;
			justify-content: space-between;
        	align-items: center; /* Align items vertically */
        	padding: 10px;
        	border-bottom: 1px solid #e1e4e8;
        	font-weight: bold;
    	}
		.notification-header .done-header-button {
			display: none; /* Initially hide the done button */
		}
		.notification-header .done-header-button.visible {
			display: inline-block; /* Show when the visible class is added */
		}
    	.notification {
    	    display: flex;
    	    justify-content: space-between;
    	    padding: 10px;
    	    border-bottom: 1px solid #e1e4e8;
    	    transition: background-color 0.2s ease-in-out;
    	    height: 40px; /* Set a fixed height */
    	    align-items: center; 
    	}
    	.notification-checkbox {
    	    margin-right: 10px;
    	}
    	.notification-title {
    	    font-weight: bold;
    	    margin-right: 10px;
    	    flex: 1;
    	}
    	.notification-buttons-container {
    	    display: none;
    	    flex-direction: row;
    	    gap: 5px;
    	}
    	.highlighted {
    	    background-color: var(--background-modifier-hover);
    	}	
		`;
		document.head.appendChild(style);

		// Main container
		const container = contentEl.createEl('div', { cls: 'notification-dashboard' });

		// Header
		const headerEl = container.createEl('div', { cls: 'notification-header' });

		// Select All Checkbox
		const selectAllCheckboxEl = headerEl.createEl('input', { type: 'checkbox', cls: 'notification-checkbox' });
		selectAllCheckboxEl.addEventListener('change', () => this.toggleSelectAll(selectAllCheckboxEl.checked));

		// Title Label
		headerEl.createEl('div', { text: 'Select all', cls: 'notification-title' });

		// Done Button
		const doneHeaderButton = headerEl.createEl('button', { text: 'Done', cls: 'notification-button done-header-button' });
		doneHeaderButton.addEventListener('click', () => {
			this.markAllDone();
		});


		// Add notifications to the container
		this.notifications.forEach(notification => new NotificationComponent(this.app, container, notification));
	}

	async onClose() {
		const { contentEl } = this;

		contentEl.empty();
	}

	toggleSelectAll(checked: boolean) {
		const checkboxes = this.contentEl.querySelectorAll('.notification-checkbox');
		checkboxes.forEach((checkbox: HTMLInputElement) => {
			checkbox.checked = checked;
		});
		this.updateDoneButtonVisibility();
	}


	markAllDone() {
		const notifications = this.contentEl.querySelectorAll('.notification');
		notifications.forEach((notification: HTMLElement) => notification.remove());
	}

	// Add the updateDoneButtonVisibility method to NotificationDashboardView class
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

