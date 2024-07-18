import { NotificationDashboardView, VIEW_TYPE_NOTIFICATION_DASHBOARD } from "components/notification-dashboard";
import { NotesController } from "controllers/notes";
import { Plugin, TFile, WorkspaceLeaf } from "obsidian"
import { Note } from "controllers/notes";
import { QueueStorage } from "service/queue-storage";
import { v4 as uuidv4 } from 'uuid';
import { notifications as mockNotifications } from "service/mock-notes";

export default class NotificationDashboardPlugin extends Plugin {
	private notesController: NotesController;
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

		// this.notifications = mockNotifications;
		// this.qs.writeNoteToCSV(notifications, basePath + '/storage/archive.csv');

		const isEmpty = await this.qs.isStorageEmpty();
		if (isEmpty) {
			await this.qs.pullNotesFromArchive();
		} 			 
		console.log("Is storage empty? ", isEmpty);
		this.notifications = await this.qs.pullNotesFromStorage();

		this.notesController = new NotesController();

		//this.notesController = new NotesController(db);
		// this.notesController.addNote({
		// 	id: "example-id",
		// 	location: '0 - TODO/Amazon Cognito.md',
		// 	reviewed: false,
		// 	tracked: true,
		// 	bookmarked: false,
		// 	last_reviewed: new Date().toISOString()
		// });

		// const notifications = this.notesController.getNotes();

		this.registerView(
			VIEW_TYPE_NOTIFICATION_DASHBOARD,
			(leaf: WorkspaceLeaf) => new NotificationDashboardView(leaf, this.notifications, this.qs)
		)

		// this.app.workspace.onLayoutReady(() => this.activateView());

		this.registerEvent(this.app.vault.on('rename', this.onFileRenamed.bind(this)))

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
				id: uuidv4(),
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

	updateBadge(){
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
