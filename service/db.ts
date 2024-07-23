import fs from 'fs';
import { Note } from 'main';
import { addRxPlugin, createRxDatabase, removeRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { notificationsSchema } from 'models/notifications';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';

addRxPlugin(RxDBUpdatePlugin);

export class DB {
	private database: any;

	async putBatchNotifications(records: Note[]) {
		await this.database.notifications.bulkInsert(records);
	}

	async init() {
		await removeRxDatabase('Notifications', getRxStorageDexie());
		await this.createDatabase();
	}

	async test() {
		const results = await this.getRecentlyReviewed(5, 1000);

		console.log("Results: ");
		for (let result of results) {
			console.log(result.toJSON());
		}

		console.log("LENGTH: ", results.length);
	}

	async createDatabase() {
		this.database = await createRxDatabase({
			name: "Notifications",
			storage: getRxStorageDexie()
		});

		await this.database.addCollections({
			notifications: {
				schema: notificationsSchema
			}
		})
	}

	async putNotification(notification: Note) {
		await this.database.notifications.insert({
			id: notification.id,
			title: notification.title,
			location: notification.location,
			reviewed: false,
			last_reviewed: notification.last_reviewed
		});
	}

	async patchNotification(id: string) {
		const doc = await this.database.notifications.findOne(id).exec();
		if (doc) {
			await doc.update({
				$set: {
					last_reviewed: new Date().toISOString()
				}
			});
		}
	}

	async getAllNotifications() {
		const results = await this.database.notifications.find().exec();
		if (results) {
			return results;
		} else {
			return null;
		}
	}

	async getNotificationByTitle(title: string) {
		const doc = await this.database.notifications.findOne({
			selector: {
				title: title
			}
		}).exec();

		return doc.toJSON();
	}

	async getUnreviewedNotifications(days: number = 15, limit: number = 10) {
		const date = new Date();
		date.setDate(date.getDate() - days);

		const results = await this.database.notifications.find({
			selector: {
				last_reviewed: { $lte: date.toISOString() }
			},
			sort: [{ last_reviewed: 'desc' }],
			limit: limit
		}).exec();

		return results;
	}

	async getRecentlyReviewed(days: number = 15, limit: number = 10) {
		const date = new Date();
		date.setDate(date.getDate() - days);

		const results = await this.database.notifications.find({
			selector: {
				last_reviewed: { $gte: date.toISOString() }
			},
			sort: [{ last_reviewed: 'desc' }],
			limit: limit
		}).exec();

		return results;
	}

	async removeNotificationsByTitle(location: string) {
		const docs = await this.database.notifications.find({
			selector: { location }
		}).exec();

		const removePromises = docs.map((doc: any) => doc.remove());
		await Promise.all(removePromises);
	}
}
