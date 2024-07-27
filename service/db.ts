import { Note, Tag } from 'main';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { addRxPlugin, createRxDatabase, removeRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { notificationsSchema } from 'models/notifications';
import { tagsSchema } from 'models/tags';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';

addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBUpdatePlugin);

export class DB {
	private notifications: any;
	private tags: any;

	async init() {
		await this.removeDatabase();
		await this.createDatabases();
	}

	async removeDatabase() {
		// await removeRxDatabase('Notifications', getRxStorageDexie());
		// await removeRxDatabase('Tags', getRxStorageDexie());
	}

	async bookmarkNotification(id: string) {
		const doc = await this.notifications.notifications.findOne(id).exec();
		if (doc) {
			await doc.update({
				$set: {
					bookmarked: !doc.bookmarked
				}
			});
		}
	}

	async createDatabases() {
		// TODO - get database if it already exists

		try {
			this.notifications = await createRxDatabase({
				name: "Notifications",
				storage: getRxStorageDexie(),
				ignoreDuplicate: true
			});
			this.tags = await createRxDatabase({
				name: "Tags",
				storage: getRxStorageDexie(),
				ignoreDuplicate: false
			});

			await this.notifications.addCollections({
				notifications: {
					schema: notificationsSchema
				}
			})

			await this.tags.addCollections({
				tagv2: {
					schema: tagsSchema
				}
			})

		} catch (error) {
			console.log("Error: ", error);
		}

	}

	async getAllNotifications() {
		const results = await this.notifications.notifications.find().exec();
		if (results) {
			return results;
		} else {
			return null;
		}
	}

	async getAllTags() {
		const results = await this.tags.tagv2.find().exec();
		if (results) {
			return results;
		} else {
			return null;
		}
	}

	async getBookmarkedNotifications() {
		const results = await this.notifications.notifications.find({
			selector: {
				bookmarked: true
			},
			sort: [{ last_reviewed: 'desc' }],
		}).exec();

		return results;
	}

	async getNotificationByTag(tag: string) {
		const doc = await this.notifications.notifications.find({
			selector: {
				tags: { $in: [tag] }
			}
		})
			.sort({ last_reviewed: 'asc' })
			.exec();

		return doc;
	}

	async getNotificationByTitle(title: string) {
		const doc = await this.notifications.notifications.findOne({
			selector: {
				title: title
			}
		}).exec();

		return doc.toJSON();
	}

	async getRecentlyReviewed(days: number = 15, limit: number = 10) {
		const date = new Date();
		date.setDate(date.getDate() - days);

		const results = await this.notifications.notifications.find({
			selector: {
				last_reviewed: { $gte: date.toISOString() }
			},
			sort: [{ last_reviewed: 'desc' }],
			limit: limit
		}).exec();

		return results;
	}

	async getUnreviewedNotifications(days: number = 15, limit: number = 10) {
		const date = new Date();
		date.setDate(date.getDate() - days);

		const results = await this.notifications.notifications.find({
			selector: {
				last_reviewed: { $lte: date.toISOString() }
			},
			sort: [{ last_reviewed: 'desc' }],
			limit: limit
		}).exec();

		return results;
	}

	async patchNotification(id: string) {
		const doc = await this.notifications.notifications.findOne(id).exec();
		if (doc) {
			await doc.update({
				$set: {
					last_reviewed: new Date().toISOString()
				}
			});
		}
	}

	async putBatchNotifications(records: Note[]) {
		await this.notifications.notifications.bulkInsert(records);
	}

	async putBatchTags(tags: Tag[]) {
		await this.tags.tagv2.bulkInsert(tags);
	}

	async putNotification(notification: Note) {
		await this.notifications.notifications.insert({
			title: notification.title,
			location: notification.location,
			bookmarked: false,
			reviewed: false,
			last_reviewed: notification.last_reviewed
		});
	}

	async removeNotificationsByTitle(location: string) {
		const docs = await this.notifications.notifications.find({
			selector: { location }
		}).exec();

		const removePromises = docs.map((doc: any) => doc.remove());
		await Promise.all(removePromises);
	}
}
