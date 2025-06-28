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
		console.log("DEBUG: DB.init - Starting database initialization");
		
		// Check for existing databases first
		await this.listExistingDatabases();
		
		// Only remove databases if we encounter errors, not proactively
		await this.createDatabases();
		
		console.log("DEBUG: DB.init - Database initialization completed");
	}

	// Add a method to check database status
	isInitialized(): boolean {
		const initialized = !!(this.notifications && this.notifications.notificationsv2);
		console.log("DEBUG: isInitialized - Database initialized:", initialized);
		return initialized;
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
		console.log("Starting database cleanup...");
		
		// List of possible database names to clean up
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
				console.log(`Attempting to remove database: ${dbName}`);
				await removeRxDatabase(dbName, getRxStorageDexie());
				console.log(`Successfully removed database: ${dbName}`);
			} catch (error) {
				console.log(`Could not remove database ${dbName}:`, error);
			}
		}

		// Also try to clear any existing IndexedDB databases manually
		try {
			if (typeof indexedDB !== 'undefined') {
				const databases = await indexedDB.databases();
				for (const db of databases) {
					if (db.name && (db.name.includes('notifications') || db.name.includes('rxdb'))) {
						console.log(`Manually removing IndexedDB database: ${db.name}`);
						await new Promise((resolve, reject) => {
							const request = indexedDB.deleteDatabase(db.name!);
							request.onsuccess = () => {
								console.log(`Successfully deleted IndexedDB database: ${db.name}`);
								resolve(true);
							};
							request.onerror = () => {
								console.log(`Failed to delete IndexedDB database: ${db.name}`);
								resolve(false);
							};
						});
					}
				}
			}
		} catch (error) {
			console.log("Error during manual IndexedDB cleanup:", error);
		}

		console.log("Database cleanup completed");
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
			console.log("DEBUG: createDatabases - Starting database creation...");
			
			// Only create database if it doesn't exist
			if (!this.notifications) {
				console.log("DEBUG: createDatabases - Creating new database with name: notifications_v2");
				this.notifications = await createRxDatabase({
					name: "notifications_v2",
					storage: getRxStorageDexie(),
					ignoreDuplicate: true,
					multiInstance: false
				});
				console.log("DEBUG: createDatabases - Database created successfully");
			} else {
				console.log("DEBUG: createDatabases - Database already exists, reusing");
			}

			// Only add collection if it doesn't exist
			if (!this.notifications.notificationsv2) {
				console.log("DEBUG: createDatabases - Adding collection: notificationsv2");
				await this.notifications.addCollections({
					notificationsv2: {
						schema: notificationsSchema
					}
				});
				console.log("DEBUG: createDatabases - Collection added successfully");
			} else {
				console.log("DEBUG: createDatabases - Collection already exists, reusing");
			}

			console.log("DEBUG: createDatabases - Database initialization completed successfully");
		} catch (error) {
			console.error("DEBUG: createDatabases - Database creation error with notifications_v2: ", error);
			
			// If the first attempt fails, try to clean up and retry once
			try {
				console.log("DEBUG: createDatabases - Attempting cleanup and retry...");
				await this.removeDatabase();
				
				// Wait a moment for cleanup
				await new Promise(resolve => setTimeout(resolve, 1000));
				
				// Retry creation with simpler config
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
				console.log("DEBUG: createDatabases - Database created successfully with fallback name");
			} catch (fallbackError) {
				console.error("DEBUG: createDatabases - Fallback database creation also failed: ", fallbackError);
				throw fallbackError;
			}
		}
	}

	async getAllNotifications() {
		// Check if database is initialized
		if (!this.notifications || !this.notifications.notificationsv2) {
			console.error("DEBUG: getAllNotifications - Database not initialized, attempting to initialize...");
			try {
				await this.init();
			} catch (error) {
				console.error("DEBUG: getAllNotifications - Failed to initialize database:", error);
				return [];
			}
		}
		
		try {
			const results = await this.notifications.notificationsv2.find().exec();
			console.log("DEBUG: getAllNotifications - Found", results.length, "notifications in database");
			
			if (results.length === 0) {
				console.log("DEBUG: getAllNotifications - No notifications found in database");
			} else {
				// Show first few notifications
				results.slice(0, 3).forEach((notification: any) => {
					console.log("DEBUG: getAllNotifications - Sample notification:", notification.toJSON().title, "tags:", notification.toJSON().tags);
				});
			}
			
			return results;
		} catch (error) {
			console.error("DEBUG: getAllNotifications - Error:", error);
			return [];
		}
	}

	async getAllTags(): Promise<string[]> {
		// Check if database is initialized
		if (!this.notifications || !this.notifications.notificationsv2) {
			console.error("DEBUG: getAllTags - Database not initialized, attempting to initialize...");
			try {
				await this.init();
			} catch (error) {
				console.error("DEBUG: getAllTags - Failed to initialize database:", error);
				return [];
			}
		}
		
		const results = await this.notifications.notificationsv2.find().exec();
		console.log("DEBUG: getAllTags - Found", results.length, "notifications in database");
		
		// Check for Standup files specifically
		const standupFiles = results.filter((notification: any) => 
			notification.toJSON().location.includes('Standup')
		);
		console.log("DEBUG: getAllTags - Found", standupFiles.length, "Standup files in database");
		
		if (standupFiles.length > 0) {
			console.log("DEBUG: getAllTags - First few Standup files:");
			standupFiles.slice(0, 3).forEach((notification: any) => {
				console.log("  -", notification.toJSON().title, "tags:", notification.toJSON().tags);
			});
		}
		
		const allTags = new Set();
		results.forEach((notification: any) => {
			const tags = notification.toJSON().tags;
			console.log("DEBUG: getAllTags - Notification", notification.toJSON().title, "has tags:", tags);
			
			// Special debugging for ServiceCore
			if (tags.includes('ServiceCore')) {
				console.log("DEBUG: getAllTags - Found ServiceCore tag in:", notification.toJSON().title);
			}
			
			if (tags.length > 0) {
				tags.forEach((tag: string) => {
					if (tag !== "") {
						allTags.add(tag)
					}
				});
			}
		});
		
		const sortedTags = [...allTags].sort() as string[];
		console.log("DEBUG: getAllTags - Final tags list:", sortedTags);
		console.log("DEBUG: getAllTags - ServiceCore in final list:", sortedTags.includes('ServiceCore'));
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
		
		console.log("DEBUG: getNotificationByTag - Searching for tag:", tag);
		
		const doc = await this.notifications.notificationsv2.find({
			selector: {
				tags: { $in: [tag] },
			},
			limit: limit
		})
			.sort({ last_reviewed: 'asc' })
			.exec();

		console.log("DEBUG: getNotificationByTag - Found", doc.length, "notifications with tag:", tag);
		
		// Debug: Show first few results
		doc.slice(0, 3).forEach((notification: any) => {
			console.log("DEBUG: getNotificationByTag - Result:", notification.toJSON().title, "tags:", notification.toJSON().tags);
		});

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
		
		// Debug: Log records being inserted
		records.forEach(record => {
			if (record.tags.includes('ADR') || record.tags.includes('ServiceCore') || record.title.includes('Tailwind') || record.title.includes('Jean-Paul Sartre')) {
				console.log("DEBUG: putBatchNotifications - Inserting note:", record.title);
				console.log("DEBUG: putBatchNotifications - Tags:", record.tags);
			}
		});
		
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

		// Debug: Log specific notifications
		if (notification.tags.includes('ADR') || notification.tags.includes('ServiceCore') || notification.title.includes('Tailwind') || notification.title.includes('Jean-Paul Sartre')) {
			console.log("DEBUG: upsertNotification - Upserting note:", notification.title);
			console.log("DEBUG: upsertNotification - Tags:", notification.tags);
		}

		try {
			// Always remove the old notification by location before inserting
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
			console.error("DEBUG: upsertNotification - Error upserting note:", notification.title, error);
			// Try to reinitialize database if it's closed
			if (error.message && error.message.includes('Database has been closed')) {
				console.log("DEBUG: upsertNotification - Database closed, attempting to reinitialize...");
				try {
					await this.init();
					// Retry the operation
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
					console.error("DEBUG: upsertNotification - Retry failed:", retryError);
				}
			}
		}
	}
}
