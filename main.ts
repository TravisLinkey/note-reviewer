import { FileStructureState } from "service/file-structure-state";
import { Note } from "controllers/notes";
import { NotificationDashboardView, VIEW_TYPE_NOTIFICATION_DASHBOARD } from "components/notification-dashboard";
import { Plugin, TFile, WorkspaceLeaf } from "obsidian"
import { QueueStorage } from "service/queue-storage";

export default class NotificationDashboardPlugin extends Plugin {
	private qs: QueueStorage;
	private notifications: Note[];
	private ribbonIconEl: HTMLElement;
	private basePath: string;

	async onload() {
		// @ts-ignore
		this.basePath = this.app.vault.adapter.basePath + "/.obsidian/plugins/note-reviewer";

		this.ribbonIconEl = this.addRibbonIcon('bell', 'Open Notifications', async () => {
			this.activateView()
		});
		this.ribbonIconEl.classList.add('badge-container');
		this.updateBadge();

		this.qs = new QueueStorage(this.basePath);

		// @ts-ignore
		new FileStructureState(this.app.vault.adapter.basePath, this.basePath, this.qs);

		const isEmpty = await this.qs.isStorageEmpty();
		if (isEmpty) {
			await this.qs.pullNotesFromArchive();
		}
		this.notifications = await this.qs.pullNotesFromStorage();

		this.registerView(
			VIEW_TYPE_NOTIFICATION_DASHBOARD,
			(leaf: WorkspaceLeaf) => new NotificationDashboardView(leaf, this.notifications, this.qs)
		)

		// this.registerEvent(this.app.vault.on('rename', this.onFileRenamed.bind(this)))

		this.addCommand({
			id: 'open-notification-dashboard',
			name: 'Open Notification Dashboard',
			callback: () => {
				this.activateView();
			}
		})
	}

	async activateView() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_NOTIFICATION_DASHBOARD);

		await this.app.workspace.getLeaf(true).setViewState({
			type: VIEW_TYPE_NOTIFICATION_DASHBOARD,
			active: true
		});

		this.app.workspace.revealLeaf(this.app.workspace.getLeavesOfType(VIEW_TYPE_NOTIFICATION_DASHBOARD)[0]);
	}

	 async onFileRenamed(file: TFile) {
	 	if (file.extension === 'md') {
	 		console.log(`File renamed: ${file.path}`);
	 		console.log("File: ", file);

	 		// @ts-ignore
	 		const note: Note = {
	 			id: "Test",
	 			title: file.basename,
	 			location: file.path,
	 			reviewed: false,
	 			tracked: true,
	 			bookmarked: false,
	 			last_reviewed: new Date().toLocaleDateString()
	 		};

	 		console.log("Note: ", note);
	 		await this.qs.writeNoteToCSV([note], this.basePath + "/storage/notes.csv");
	 	}
	 }

	updateBadge() {
		const unreadCount = this.getUnreadNotificationCount(); // Implement this method to get the count of unread notifications
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

	getUnreadNotificationCount(): number {
		return 5;
	}
}
