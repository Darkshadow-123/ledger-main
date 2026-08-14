import { Request, Response, NextFunction } from "express";
import { env } from "../../config/env";
import { Webhook } from "svix";
import { handleUserCreated } from "./auth.service";

export const clerkWebhookHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const wh = new Webhook(env.CLERK_WEBHOOK_SECRET)

        const payload = wh.verify(req.body.toString(), {
            "svix-id":  req.headers["svix-id"] as string,
            "svix-timestamp": req.headers["svix-timestamp"] as string,
            "svix-signature": req.headers["svix-signature"] as string,
        }) as {type: string; data: any}

        if(payload.type === "user.created"){

            const user = await handleUserCreated(payload.data)

            return res.status(200).json({
                success: true,
                data: user
            })
        }

        return res.status(200).json({
            success: true
        })
    } catch (error) {
        next(error)
    }
}