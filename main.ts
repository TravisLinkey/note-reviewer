import { FileStructureState } from "service/file-structure-state";
import { NotificationDashboardView, VIEW_TYPE_NOTIFICATION_DASHBOARD } from "components/notification-dashboard";
import { Plugin, TFile, WorkspaceLeaf } from "obsidian"
import { QueueStorage } from "service/queue-storage";

export interface Note {
	id: string;
	title: string;
	location: string;
	reviewed: boolean;
	tracked: boolean;
	bookmarked: boolean;
	last_reviewed: string;
}

export default class NotificationDashboardPlugin extends Plugin {
	private qs: QueueStorage;
	private notifications: Note[];
	private ribbonIconEl: HTMLElement;
	private basePath: string;
	private fileStructure: FileStructureState;

	async onload() {
		// @ts-ignore
		this.basePath = this.app.vault.adapter.basePath + "/.obsidian/plugins/note-reviewer";

		this.ribbonIconEl = this.addRibbonIcon('bell', 'Open Notifications', async () => {
			await this.activateView()
		});
		this.ribbonIconEl.classList.add('badge-container');

		this.qs = new QueueStorage(this.basePath);

		// @ts-ignore
		this.fileStructure = new FileStructureState(this.app.vault.adapter.basePath, this.basePath, this.qs);
		await this.reloadView();
	}

	async activateView() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_NOTIFICATION_DASHBOARD);

		await this.app.workspace.getLeaf(true).setViewState({
			type: VIEW_TYPE_NOTIFICATION_DASHBOARD,
			active: true
		});
		this.app.workspace.revealLeaf(this.app.workspace.getLeavesOfType(VIEW_TYPE_NOTIFICATION_DASHBOARD)[0]);
	}

	moveIconToBottom() {
		const ribbonContainer = document.querySelector('.workspace-ribbon') as HTMLElement;
		console.log("Moving icon to bottom.", ribbonContainer);

		if (ribbonContainer) {
			ribbonContainer.appendChild(this.ribbonIconEl);
		}
	}

	async onFileRenamed() {
		await  this.reloadView();
	}

	async reloadView() {
		await this.fileStructure.main();

		this.app.workspace.detachLeavesOfType(VIEW_TYPE_NOTIFICATION_DASHBOARD)

		const isEmpty = await this.qs.getNotesCount() < 1;
		if (isEmpty) {
			await this.qs.pullNotesFromArchive();
		}
		this.notifications = await this.qs.pullNotesFromStorage();

		this.registerView(
			VIEW_TYPE_NOTIFICATION_DASHBOARD,
			(leaf: WorkspaceLeaf) => new NotificationDashboardView(leaf, this.notifications, this.qs)
		)

		this.moveIconToBottom();

		await this.updateBadge();

		this.registerEvent(this.app.vault.on('rename', this.onFileRenamed.bind(this)))
		this.addCommand({
			id: 'open-notification-dashboard',
			name: 'Open Notification Dashboard',
			callback: () => {
				this.activateView();
			}
		})
	}

	async updateBadge() {
		const unreadCount = await this.qs.getNotesCount();

		if (unreadCount > 0) {
			let badgeEl = this.ribbonIconEl.querySelector('.badge');
			if (!badgeEl) {
				badgeEl = document.createElement('div');
				badgeEl.className = 'badge';
				this.ribbonIconEl.appendChild(badgeEl);
			}
			badgeEl.textContent = unreadCount < 10 ? unreadCount.toString() : "+";
			badgeEl.classList.add('active');
		} else {
			const badgeEl = this.ribbonIconEl.querySelector('.badge');
			if (badgeEl) {
				badgeEl.classList.remove('active');
			}
		}
	};
}
