export const tagsSchema = {
	version: 7,
	primaryKey: 'id',
	type: 'object',
	properties: {
		id: {
			type: 'string',
			maxLength: 100
		},
		title: {
			type: 'string',
			minLength: 1,
			maxLength: 45,
			unique: true,
		},
	},
	required: ['id', 'title']
};
