const { z } = require('zod');

const createTeamSchema = z.object({
  eventId: z.number().int().positive().optional(),
  eventName: z.string().min(2).max(255),
  teamName: z.string().min(2).max(255),
  description: z.string().optional(),
  lookingFor: z.string().optional()
});

const joinRequestSchema = z.object({
  pitch: z.string().min(10).max(1000)
});

const processRequestSchema = z.object({
  status: z.enum(['accepted', 'rejected'])
});

module.exports = {
  createTeamSchema,
  joinRequestSchema,
  processRequestSchema
};
