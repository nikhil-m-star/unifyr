const { z } = require('zod');

const nonEmptyPatch = (shape) => z.object(shape).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required.',
});

const updateUserRoleSchema = z.object({
  role: z.enum(['student', 'admin']),
});

const updateUserSchema = nonEmptyPatch({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional(),
  bio: z.string().max(2000).optional(),
  profile_pic: z.string().url().max(2048).optional(),
  is_ready: z.boolean().optional(),
  ready_tag: z.string().max(100).optional(),
});

const createAdminEventSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().max(5000).optional(),
  imageUrl: z.string().url().max(2048).optional(),
  category: z.string().max(100).optional(),
  eventDate: z.union([z.string().datetime(), z.null()]).optional(),
});

const updateAdminEventSchema = nonEmptyPatch({
  title: z.string().min(3).max(255).optional(),
  description: z.string().max(5000).optional(),
  imageUrl: z.string().url().max(2048).optional(),
  category: z.string().max(100).optional(),
  eventDate: z.union([z.string().datetime(), z.null()]).optional(),
});

const updateAdminTeamSchema = nonEmptyPatch({
  eventName: z.string().min(2).max(255).optional(),
  teamName: z.string().min(2).max(255).optional(),
  description: z.string().max(5000).optional(),
  lookingFor: z.string().max(5000).optional(),
  status: z.enum(['open', 'closed']).optional(),
});

module.exports = {
  updateUserRoleSchema,
  updateUserSchema,
  createAdminEventSchema,
  updateAdminEventSchema,
  updateAdminTeamSchema,
};
