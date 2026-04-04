export const userSchema = {
  type: 'object',
  required: ['id', 'email', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'integer', example: 1 },
    username: { type: 'string', nullable: true, example: 'aelar' },
    email: { type: 'string', format: 'email', example: 'aelar@example.com' },
    auth0Id: { type: 'string', nullable: true, example: 'auth0|123456' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;
