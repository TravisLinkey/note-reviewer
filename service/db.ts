// This file is commented out as it contains the old RxDB implementation
// The new SQLite implementation is in service/db.ts

/*
import { addRxPlugin, createRxDatabase, removeRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { Note, Tag } from 'main';
import { notificationsSchema } from 'models/notifications';

addRxPlugin(getRxStorageDexie());

export class DB {
	private db: any;

	async init() {
		await this.createDatabases();
	}

	async removeDatabase() {
		if (this.db) {
			await removeRxDatabase('notifications', 'dexie');
		}
	}

	async createDatabases() {
		try {
			this.db = await createRxDatabase({
				name: 'notifications',
				storage: getRxStorageDexie(),
				schema: {
					notifications: notificationsSchema
				}
			});
		} catch (error) {
			console.error("Error creating database: ", error);
			throw error;
		}
	}

	async bookmarkNotification(title: string) {
		const notification = await this.db.notifications.findOne({
			selector: {
				title
			}
		}).exec();

		if (notification) {
			await notification.patch({
				bookmarked: !notification.bookmarked
			});
		}
	}

	async getAllNotifications() {
		const notifications = await this.db.notifications.find().exec();
		return notifications.map((notification: any) => notification.toJSON());
	}

	async getAllTags(): Promise<string[]> {
		const notifications = await this.db.notifications.find().exec();
		const allTags = new Set<string>();

		notifications.forEach((notification: any) => {
			const tags = notification.tags;
			if (tags && Array.isArray(tags)) {
				tags.forEach((tag: string) => {
					if (tag && tag !== "") {
						allTags.add(tag);
					}
				});
			}
		});

		return [...allTags].sort();
	}

	async getBookmarkedNotifications() {
		const notifications = await this.db.notifications.find({
			selector: {
				bookmarked: true
			}
		}).exec();
		return notifications.map((notification: any) => notification.toJSON());
	}

	async getNotificationByLocation(location: string) {
		const notification = await this.db.notifications.findOne({
			selector: {
				location
			}
		}).exec();
		return notification ? notification.toJSON() : null;
	}

	async getNotificationByTag(tag: string, limit: number = 50) {
		const notifications = await this.db.notifications.find({
			selector: {
				tags: {
					$elemMatch: {
						$eq: tag
					}
				}
			}
		}).limit(limit).exec();
		return notifications.map((notification: any) => notification.toJSON());
	}

	async getNotificationByTitle(title: string) {
		const notification = await this.db.notifications.findOne({
			selector: {
				title
			}
		}).exec();
		return notification ? notification.toJSON() : null;
	}

	async getRecentlyReviewed(days: number = 15, limit: number = 10) {
		const date = new Date();
		date.setDate(date.getDate() - days);

		const notifications = await this.db.notifications.find({
			selector: {
				last_reviewed: {
					$gte: date.toISOString()
				}
			}
		}).limit(limit).exec();
		return notifications.map((notification: any) => notification.toJSON());
	}

	async getUnreviewedNotifications(days: number = 15, limit: number = 10) {
		const date = new Date();
		date.setDate(date.getDate() - days);

		const notifications = await this.db.notifications.find({
			selector: {
				last_reviewed: {
					$lte: date.toISOString()
				}
			}
		}).limit(limit).exec();
		return notifications.map((notification: any) => notification.toJSON());
	}

	async patchNotification(location: string) {
		const notification = await this.db.notifications.findOne({
			selector: {
				location
			}
		}).exec();

		if (notification) {
			await notification.patch({
				last_reviewed: new Date().toISOString()
			});
		}
	}

	async putBatchNotifications(records: Note[]) {
		await this.db.notifications.bulkInsert(records);
	}

	async putNotification(notification: Note) {
		await this.db.notifications.insert(notification);
	}

	async removeNotificationByLocation(location: string) {
		const notification = await this.db.notifications.findOne({
			selector: {
				location
			}
		}).exec();

		if (notification) {
			await notification.remove();
		}
	}

	async upsertNotification(notification: Note) {
		const existingNotification = await this.db.notifications.findOne({
			selector: {
				location: notification.location
			}
		}).exec();

		if (existingNotification) {
			await existingNotification.patch(notification);
		} else {
			await this.db.notifications.insert(notification);
		}
	}
}
*/
