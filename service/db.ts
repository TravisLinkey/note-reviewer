import { Note, Tag } from 'main';
import { addRxPlugin, createRxDatabase, removeRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { notificationsSchema } from 'models/notifications';
import { RxDBMigrationPlugin } from 'rxdb/plugins/migration';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';

addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBMigrationPlugin);

export class DB {
	private notifications: any;
	private dbInstance: any;

	async init() {
		await this.listExistingDatabases();
		await this.createDatabases();
		
	}

	isInitialized(): boolean {
		const initialized = !!(this.notifications && this.notifications.notificationsv2);
		return initialized;
	}

	async listExistingDatabases() {
		try {
		} catch (error) {
			console.log("Error checking existing databases:", error);
		}
	}

	async removeDatabase() {
		const databaseNames = [
			'notifications_v2',
			'notifications_v3', 
			'notifications',
			'rxdb_notifications_v2',
			'rxdb_notifications_v3',
			'rxdb_notifications'
		];

		for (const dbName of databaseNames) {
			try {
				await removeRxDatabase(dbName, getRxStorageDexie());
			} catch (error) {
				console.log(`Could not remove database ${dbName}:`, error);
			}
		}

		try {
			if (typeof indexedDB !== 'undefined') {
				const databases = await indexedDB.databases();
				for (const db of databases) {
					if (db.name && (db.name.includes('notifications') || db.name.includes('rxdb'))) {
						await new Promise((resolve, reject) => {
							const request = indexedDB.deleteDatabase(db.name!);
							request.onsuccess = () => {
								resolve(true);
							};
							request.onerror = () => {
								resolve(false);
							};
						});
					}
				}
			}
		} catch (error) {
			console.error("Error during manual IndexedDB cleanup:", error);
		}
	}

	async bookmarkNotification(title: string) {
		if (!this.notifications || !this.notifications.notificationsv2) {
			console.error("Database not initialized");
			return;
		}
		
		const doc = await this.notifications.notificationsv2.findOne({
			selector: {
				title: title
			}
		}).exec();
		if (doc) {
			await doc.update({
				$set: {
					bookmarked: !doc.bookmarked
				}
			});
		}
	}

	async createDatabases() {
		try {
			if (!this.notifications) {
				this.notifications = await createRxDatabase({
					name: "notifications_v2",
					storage: getRxStorageDexie(),
					ignoreDuplicate: true,
					multiInstance: false
				});
			}

			if (!this.notifications.notificationsv2) {
				await this.notifications.addCollections({
					notificationsv2: {
						schema: notificationsSchema
					}
				});
			}

		} catch (error) {
			console.error("Database creation error with notifications_v2: ", error);
			try {
				await this.removeDatabase();
				await new Promise(resolve => setTimeout(resolve, 1000));
				this.notifications = await createRxDatabase({
					name: "notifications_v3",
					storage: getRxStorageDexie(),
					ignoreDuplicate: true,
					multiInstance: false
				});

				await this.notifications.addCollections({
					notificationsv2: {
						schema: notificationsSchema
					}
				});
			} catch (fallbackError) {
				throw fallbackError;
			}
		}
	}

	async getAllNotifications() {
		if (!this.notifications || !this.notifications.notificationsv2) {
			try {
				await this.init();
			} catch (error) {
				console.error("Failed to initialize database:", error);
				return [];
			}
		}
		
		try {
			const results = await this.notifications.notificationsv2.find().exec();
			
			return results;
		} catch (error) {
			return [];
		}
	}

	async getAllTags(): Promise<string[]> {
		if (!this.notifications || !this.notifications.notificationsv2) {
			try {
				await this.init();
			} catch (error) {
				console.error("Failed to initialize database:", error);
				return [];
			}
		}
		
		const results = await this.notifications.notificationsv2.find().exec();
		const standupFiles = results.filter((notification: any) => 
			notification.toJSON().location.includes('Standup')
		);

		const allTags = new Set();
		results.forEach((notification: any) => {
			const tags = notification.toJSON().tags;
			
			if (tags.length > 0) {
				tags.forEach((tag: string) => {
					if (tag !== "") {
						allTags.add(tag)
					}
				});
			}
		});
		
		const sortedTags = [...allTags].sort() as string[];
		return sortedTags;
	}

	async getBookmarkedNotifications() {
		if (!this.notifications || !this.notifications.notificationsv2) {
			console.error("Database not initialized");
			return [];
		}
		
		const results = await this.notifications.notificationsv2.find({
			selector: {
				bookmarked: true
			},
			sort: [{ last_reviewed: 'asc' }],
		}).exec();

		return results;
	}


	async getNotificationByLocation(location: string) {
		if (!this.notifications || !this.notifications.notificationsv2) {
			console.error("Database not initialized");
			return null;
		}
		
		const doc = await this.notifications.notificationsv2.findOne({
			selector: {
				location: location
			}
		}).exec();

		try {
			return doc.toJSON();
		} catch (e) {
			return null;
		}

	}

	async getNotificationByTag(tag: string, limit: number = 50) {
		if (!this.notifications || !this.notifications.notificationsv2) {
			console.error("Database not initialized");
			return [];
		}
		
		const doc = await this.notifications.notificationsv2.find({
			selector: {
				tags: { $in: [tag] },
			},
			limit: limit
		})
			.sort({ last_reviewed: 'asc' })
			.exec();

		return doc;
	}

	async getNotificationByTitle(title: string) {
		if (!this.notifications || !this.notifications.notificationsv2) {
			console.error("Database not initialized");
			return null;
		}
		
		const doc = await this.notifications.notificationsv2.findOne({
			selector: {
				title: title
			}
		}).exec();

		return doc.toJSON();
	}

	async getRecentlyReviewed(days: number = 15, limit: number = 10) {
		if (!this.notifications || !this.notifications.notificationsv2) {
			console.error("Database not initialized");
			return [];
		}
		
		const date = new Date();
		date.setDate(date.getDate() - days);

		const results = await this.notifications.notificationsv2.find({
			selector: {
				last_reviewed: { $gte: date.toISOString() }
			},
			sort: [{ last_reviewed: 'asc' }],
			limit: limit
		}).exec();

		return results;
	}

	async getUnreviewedNotifications(days: number = 15, limit: number = 10) {
		if (!this.notifications || !this.notifications.notificationsv2) {
			console.error("Database not initialized");
			return [];
		}
		
		const date = new Date();
		date.setDate(date.getDate() - days);

		const results = await this.notifications.notificationsv2.find({
			selector: {
				last_reviewed: { $lte: date.toISOString() }
			},
			sort: [{ last_reviewed: 'asc' }],
			limit: limit
		}).exec();

		return results;
	}

	async patchNotification(location: string) {
		if (!this.notifications || !this.notifications.notificationsv2) {
			console.error("Database not initialized");
			return;
		}
		
		const doc = await this.notifications.notificationsv2.findOne(location).exec();
		if (doc) {
			await doc.update({
				$set: {
					last_reviewed: new Date().toISOString()
				}
			});
		}
	}

	async putBatchNotifications(records: Note[]) {
		if (!this.notifications || !this.notifications.notificationsv2) {
			console.error("Database not initialized");
			return;
		}
		
		await this.notifications.notificationsv2.bulkInsert(records);
	}

	async putNotification(notification: Note) {
		if (!this.notifications || !this.notifications.notificationsv2) {
			console.error("Database not initialized");
			return;
		}
		
		await this.notifications.notificationsv2.insert({
			title: notification.title,
			location: notification.location,
			bookmarked: false,
			reviewed: false,
			last_reviewed: notification.last_reviewed,
			tags: notification.tags
		});
	}

	async removeNotificationByLocation(location: string) {
		if (!this.notifications || !this.notifications.notificationsv2) {
			console.error("Database not initialized");
			return;
		}
		
		const docs = await this.notifications.notificationsv2.find({
			selector: { location }
		}).exec();

		const removePromises = docs.map((doc: any) => doc.remove());
		await Promise.all(removePromises);
	}

	async upsertNotification(notification: Note) {
		if (!this.notifications || !this.notifications.notificationsv2) {
			console.error("Database not initialized");
			return;
		}

		try {
			await this.removeNotificationByLocation(notification.location);

			return await this.notifications.notificationsv2.insert({
				title: notification.title,
				location: notification.location,
				bookmarked: false,
				reviewed: false,
				last_reviewed: notification.last_reviewed,
				tags: notification.tags
			});
		} catch (error) {
			console.error("Error upserting note:", notification.title, error);
				if (error.message && error.message.includes('Database has been closed')) {
				try {
					await this.init();
					await this.removeNotificationByLocation(notification.location);
					return await this.notifications.notificationsv2.insert({
						title: notification.title,
						location: notification.location,
						bookmarked: false,
						reviewed: false,
						last_reviewed: notification.last_reviewed,
						tags: notification.tags
					});
				} catch (retryError) {
					console.error("Retry failed:", retryError);
				}
			}
		}
	}
}
