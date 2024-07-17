import { NotificationDashboardView, VIEW_TYPE_NOTIFICATION_DASHBOARD } from "components/notification-dashboard";
import { NotesController } from "controllers/notes";
import { initDatabase } from "db/sqlite";
import { Plugin, TFile, WorkspaceLeaf } from "obsidian"
import { Note } from "controllers/notes";


export default class ExamplePlugin extends Plugin {
	private notesController: NotesController;

	async onload() {

		const notifications: Note[] = [
			{
				id: 'something_1',
				reviewed: 0,
				tracked: 1,
				bookmarked: 0,
				last_reviewed: "",
				title: 'Amazon Cognito',
				location: '0 - TODO/Amazon Cognito.md'
				
			},
			{
				id: 'something_1',
				reviewed: 0,
				tracked: 1,
				bookmarked: 0,
				last_reviewed: "",
				title: 'Something_Again',
				location: '0 - TODO/Something_Again.md'
			},
			{
				id: 'something_1',
				reviewed: 0,
				tracked: 1,
				bookmarked: 0,
				last_reviewed: "",
				title: 'TODO',
				location: '0 - TODO/TODO.md'
			}
		];

		const db = await initDatabase();

		//this.notesController = new NotesController(db);
		this.notesController = new NotesController();
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
			(leaf: WorkspaceLeaf) => new NotificationDashboardView(leaf, notifications)
		)

		this.app.workspace.onLayoutReady(() => this.activateView());

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

	onFileRenamed(file: TFile) {
		if (file.extension === 'md') {
			console.log(`File renamed: ${file.path}`);

			// TODO - add file to Notes database
		}
	}
}
