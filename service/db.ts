import { Note, Tag } from 'main';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { addRxPlugin, createRxDatabase, removeRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { notificationsSchema } from 'models/notifications';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';

addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBDevModePlugin);

export class DB {
	private notifications: any;

	async init() {
		// Check for existing databases first
		await this.listExistingDatabases();
		
		// Remove any existing databases to start fresh and avoid migration issues
		await this.removeDatabase();
		await this.createDatabases();
	}

	// Add a method to check database status
	isInitialized(): boolean {
		return !!(this.notifications && this.notifications.notificationsv2);
	}

	// Add a method to list existing databases for debugging
	async listExistingDatabases() {
		try {
			// This is a simple way to check if databases exist
			console.log("Checking for existing databases...");
			// Note: This is a basic check - in a real scenario you might want to use
			// the storage adapter's methods to list databases
		} catch (error) {
			console.log("Error checking existing databases:", error);
		}
	}

	async removeDatabase() {
		try {
			await removeRxDatabase('notifications_v2', getRxStorageDexie());
		} catch (error) {
			console.log("Could not remove notifications_v2 database:", error);
		}
		
		try {
			await removeRxDatabase('notifications_v3', getRxStorageDexie());
		} catch (error) {
			console.log("Could not remove notifications_v3 database:", error);
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
			console.log("Starting database creation...");
			if (!this.notifications) {
				console.log("Creating new database with name: notifications_v2");
				this.notifications = await createRxDatabase({
					name: "notifications_v2",
					storage: getRxStorageDexie(),
					ignoreDuplicate: true,
					multiInstance: false,
					allowSlowCount: true
				});
				console.log("Database created successfully");
			}

			if (!this.notifications.notificationsv2) {
				console.log("Adding collection: notificationsv2");
				await this.notifications.addCollections({
					notificationsv2: {
						schema: notificationsSchema,
						migrationStrategies: {
							1: (oldDoc: any) => oldDoc // identity migration for v1
						}
					}
				})
				console.log("Collection added successfully");
			}
		} catch (error) {
			console.error("Database creation error with notifications_v2: ", error);
			
			// Try with a different database name as fallback
			try {
				console.log("Attempting to create database with fallback name...");
				this.notifications = await createRxDatabase({
					name: "notifications_v3",
					storage: getRxStorageDexie(),
					ignoreDuplicate: true,
					multiInstance: false,
					allowSlowCount: true
				});

				if (!this.notifications.notificationsv2) {
					await this.notifications.addCollections({
						notificationsv2: {
							schema: notificationsSchema
						}
					})
				}
				console.log("Database created successfully with fallback name");
			} catch (fallbackError) {
				console.error("Fallback database creation also failed: ", fallbackError);
				throw fallbackError;
			}
		}
	}

	async getAllNotifications() {
		// Check if database is initialized
		if (!this.notifications || !this.notifications.notificationsv2) {
			console.error("Database not initialized");
			return [];
		}
		
		const results = await this.notifications.notificationsv2.find().exec();
		if (results) {
			return results;
		} else {
			return [];
		}
	}

	async getAllTags(): Promise<string[]> {
		if (!this.notifications || !this.notifications.notificationsv2) {
			console.error("Database not initialized");
			return [];
		}
		
		const results = await this.notifications.notificationsv2.find().exec();
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
		return [...allTags].sort() as string[];
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
		
		return this.notifications.notificationsv2.upsert({
			title: notification.title,
			location: notification.location,
			bookmarked: false,
			reviewed: false,
			last_reviewed: notification.last_reviewed,
			tags: notification.tags
		});
	}
}
