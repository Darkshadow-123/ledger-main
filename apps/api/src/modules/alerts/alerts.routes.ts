import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth'
import {
  createAlert,
  deleteAlert,
  getAlerts,
  resolveAlert
} from './alerts.controller'

const router = Router()

router.use(authMiddleware)

router.get('/', getAlerts)

router.post('/', createAlert)

router.delete('/:id', deleteAlert)

router.patch(
  '/:id/resolve',
  resolveAlert
)

export default router