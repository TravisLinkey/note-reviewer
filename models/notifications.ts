
export const notificationsSchema = {
	version: 0,
	primaryKey: 'id',
	type: 'object',
	properties: {
		id: {
			type: 'string',
			maxLength: 10,
		},
		title: {
			type: 'string',
			maxLength: 45,
		},
		location: {
			type: 'string',
			maxLength: 100,
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
	},
	required: ['id', 'title', 'location', 'reviewed', 'last_reviewed']
};

