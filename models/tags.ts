export const tagsSchema = {
	version: 8,
	primaryKey: 'title',
	type: 'object',
	properties: {
		title: {
			type: 'string',
			minLength: 1,
			maxLength: 45,
			unique: true,
		},
	},
	required: ['title']
};
