import { Request, Response, NextFunction } from "express";
import crypto from 'crypto'
import { processChatRequest } from "./proxy.service";
import { AppError } from "../../lib/AppError";

export const proxyChat = async(
    req: Request,
    res: Response,
    next:  NextFunction
) => {
    try {
        const userId = req.user?.id
        if(!userId){
            throw new AppError('User not authenticated', 401, 'UNAUTHORIZED')
        }

        const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID()

        const { model, messages } = req.body

        if (!model || typeof model !== 'string'){
            throw new AppError('model is required', 400, 'INVALID_REQUEST')
        }

        if(!Array.isArray(messages) || messages.length === 0){
            throw new AppError('message must be a non-empty array', 400, 'INVALID_REQUEST')
        }

        const result = await processChatRequest({
            userId,
            model,
            messages,
            requestId
        })

        return res.status(200).json({
            success: true,
            data: result,
            requestId
        })
    } catch (error) {
        next (error)
    }
}