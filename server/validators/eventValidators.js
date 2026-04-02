const { z } = require('zod');

const createEventSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  category: z.string().max(100).optional(),
  eventDate: z.string().datetime().optional()
});

module.exports = {
  createEventSchema
};
