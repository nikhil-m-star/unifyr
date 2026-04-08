const express = require('express');
const { protect, requireAuthentication, syncUser, isAdmin } = require('../middlewares/authMiddleware');
const validateRequest = require('../middlewares/validateRequest');
const {
  getAdminOverview,
  updateUserRole,
  updateUser,
  createAdminEvent,
  updateAdminEvent,
  deleteAdminEvent,
  updateAdminTeam,
  deleteAdminTeam,
} = require('../controllers/adminController');
const {
  updateUserRoleSchema,
  updateUserSchema,
  createAdminEventSchema,
  updateAdminEventSchema,
  updateAdminTeamSchema,
} = require('../validators/adminValidators');

const router = express.Router();

router.use(protect, requireAuthentication, syncUser, isAdmin);

router.get('/overview', getAdminOverview);
router.patch('/users/:id/role', validateRequest(updateUserRoleSchema), updateUserRole);
router.patch('/users/:id', validateRequest(updateUserSchema), updateUser);

router.post('/events', validateRequest(createAdminEventSchema), createAdminEvent);
router.patch('/events/:id', validateRequest(updateAdminEventSchema), updateAdminEvent);
router.delete('/events/:id', deleteAdminEvent);

router.patch('/teams/:id', validateRequest(updateAdminTeamSchema), updateAdminTeam);
router.delete('/teams/:id', deleteAdminTeam);

module.exports = router;
