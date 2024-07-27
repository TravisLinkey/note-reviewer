export const tagsSchema = {
	version: 1,
	primaryKey: 'id',
	type: 'object',
	properties: {
		id: {
			type: 'string',
			maxLength: 100
		},
		title: {
			type: 'string',
			maxLength: 45,
			unique: true,
		},
	},
	required: ['id', 'title']
};
