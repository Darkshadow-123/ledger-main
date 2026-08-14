import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth'
import { adminMiddleware } from '../../middleware/admin'

import {
  getUserUsage,
  getUsers,
  updateUserLimits
} from './admin.controller'

const router = Router()

router.use(authMiddleware)
router.use(adminMiddleware)

router.get('/users', getUsers)

router.get(
  '/users/:id/usage',
  getUserUsage
)

router.patch(
  '/users/:id/limits',
  updateUserLimits
)

export default router