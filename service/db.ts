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

	async bookmarkNotification(title: string) {
		const doc = await this.notifications.notificationsv2.findOne(title).exec();
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
			this.notifications = await createRxDatabase({
				name: "Notifications_v2",
				storage: getRxStorageDexie(),
				ignoreDuplicate: true
			});
			this.tags = await createRxDatabase({
				name: "Tags_v3",
				storage: getRxStorageDexie(),
				ignoreDuplicate: false
			});

			await this.notifications.addCollections({
				notificationsv2: {
					schema: notificationsSchema
				}
			})

			await this.tags.addCollections({
				tagv3: {
					schema: tagsSchema
				}
			})

		} catch (error) {
			console.log("Error: ", error);
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

	async getAllTags() {
		const results = await this.tags.tagv3.find().exec();
		if (results) {
			return results;
		} else {
			return null;
		}
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

		return doc.toJSON();
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

		console.log("Limit: ", limit)

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
		console.log("Patching notification: ", location, doc);
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

	async putBatchTags(tags: Tag[]) {
		await this.tags.tagv3.bulkInsert(tags);
	}

	async putNotification(notification: Note) {
		await this.notifications.notificationsv2.insert({
			title: notification.title,
			location: notification.location,
			bookmarked: false,
			reviewed: false,
			last_reviewed: notification.last_reviewed
		});
	}

	async removeNotificationsByTitle(location: string) {
		const docs = await this.notifications.notificationsv2.find({
			selector: { location }
		}).exec();

		const removePromises = docs.map((doc: any) => doc.remove());
		await Promise.all(removePromises);
	}

	async removeTagByTitle(title: string) {
		const doc = await this.tags.tagv3.findOne({
			selector: { title: title }
		}).exec();

		await doc.remove();
		console.log("Removed TAG: ", title);
	}
}
