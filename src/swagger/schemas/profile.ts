export const profileSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    username: { type: 'string', nullable: true },
    email: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'username', 'email', 'createdAt'],
} as const;

export const profileInputSchema = {
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 3, maxLength: 30 },
  },
  required: ['username'],
} as const;
