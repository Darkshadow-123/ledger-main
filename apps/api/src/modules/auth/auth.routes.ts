import express, { Router } from "express";
import { clerkWebhookHandler } from "./auth.controller";

const router = Router();

router.post("/webhook", express.raw({ type: 'application/json' }), clerkWebhookHandler)

export default router