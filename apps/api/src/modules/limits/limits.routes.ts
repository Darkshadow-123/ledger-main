import { Router } from "express"
import { getLimits, updateLimits } from "./limits.controller"
import { authMiddleware } from "../../middleware/auth"

const router = Router()

router.get('/', authMiddleware, getLimits)
router.patch('/', authMiddleware, updateLimits)

export default router