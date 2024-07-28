
export const notificationsSchema = {
	version: 1,
	primaryKey: 'location',
	type: 'object',
	properties: {
		title: {
			type: 'string',
			maxLength: 45,
		},
		location: {
			type: 'string',
			maxLength: 100,
			unique: true
		},
		reviewed: {
			type: 'boolean',
		},
		tracked: {
			type: 'boolean',
		},
		bookmarked: {
			type: 'boolean',
		},
		last_reviewed: {
			type: 'string',
			format: 'date-time'
		},
		tags: {
			type: 'array',
			items: {
				type: 'string'
			}
		}
	},
	required: ['title', 'location', 'reviewed', 'last_reviewed']
};

