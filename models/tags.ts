export const tagsSchema = {
	version: 1,
	primaryKey: 'title',
	type: 'object',
	properties: {
		title: {
			type: 'string',
			maxLength: 45,
		},
	},
	required: ['id', 'title']
};

