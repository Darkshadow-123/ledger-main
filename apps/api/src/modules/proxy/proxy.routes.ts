import { Router } from "express";
import { proxyChat } from "./proxy.controller";
import { authMiddleware } from "../../middleware/auth";

const router = Router()

router.post("/chat", authMiddleware, proxyChat)

export default router