import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth'

import {
  getBreakdown,
  getEvents,
  getHourly,
  getSummary
} from './usage.controller'

const router = Router()

router.use(authMiddleware)

router.get('/summary', getSummary)
router.get('/breakdown', getBreakdown)
router.get('/events', getEvents)
router.get('/hourly', getHourly)

export default router