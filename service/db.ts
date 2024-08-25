import { Note, Tag } from 'main';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { addRxPlugin, createRxDatabase, removeRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { notificationsSchema } from 'models/notifications';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';

addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBUpdatePlugin);

export class DB {
	private notifications: any;

	async init() {
		// await this.removeDatabase();
		await this.createDatabases();
	}

	async removeDatabase() {
		await removeRxDatabase('Notifications_v2', getRxStorageDexie());
	}

	async bookmarkNotification(title: string) {
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
					name: "Notifications_v2",
					storage: getRxStorageDexie(),
					ignoreDuplicate: true
				});
			}

			if (!this.notifications.notificationsv2) {
				await this.notifications.addCollections({
					notificationsv2: {
						schema: notificationsSchema
					}
				})
			}
		} catch (error) {
			console.error("Error: ", error);
		}

	}

	async getAllNotifications() {
		const results = await this.notifications.notificationsv2.find().exec();
		if (results) {
			return results;
		} else {
			return null;
		}
	}

	async getAllTags(): Promise<string[]> {
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
		const results = await this.notifications.notificationsv2.find({
			selector: {
				bookmarked: true
			},
			sort: [{ last_reviewed: 'asc' }],
		}).exec();

		return results;
	}


	async getNotificationByLocation(location: string) {
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
		const doc = await this.notifications.notificationsv2.findOne({
			selector: {
				title: title
			}
		}).exec();

		return doc.toJSON();
	}

	async getRecentlyReviewed(days: number = 15, limit: number = 10) {
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
		await this.notifications.notificationsv2.bulkInsert(records);
	}

	async putNotification(notification: Note) {
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
		const docs = await this.notifications.notificationsv2.find({
			selector: { location }
		}).exec();

		const removePromises = docs.map((doc: any) => doc.remove());
		await Promise.all(removePromises);
	}

	async upsertNotification(notification: Note) {
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
