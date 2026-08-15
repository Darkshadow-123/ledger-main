import { env } from '../config/env'
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "@clerk/backend";

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization

        if(!authHeader || !authHeader.startsWith("Bearer ")){
            return res.status(401).json({
                success: false,
                data: null,
                error: {
                    code: "UNAUTHORIZED",
                    message: "Missing or invalid token"
                }
            })
        }

        const token = authHeader.split(" ")[1];

        if(!token){
            return res.status(401).json({
                success: false,
                data: null,
                error: {
                    code: "UNAUTHORIZED",
                    message: "Token not provided"
                }
            })
        }

        const authorizedParties = [
            'http://localhost:3000',
            env.FRONTEND_URL
        ].filter(Boolean) as string[]

        const verified = await verifyToken(token, {
            secretKey: env.CLERK_SECRET_KEY,
            ...(authorizedParties.length > 0 ? { authorizedParties } : {})
        })

        req.user = {
            id: verified.sub,
        };

        next()
    } catch (error: any) {
        if(error?.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                data: null,
                error: {
                    code: "TOKEN_EXPIRED",
                    message:  "Session expired, please login again"
                }
            })
        }

        return res.status(401).json({
            success: false,
            data: null,
            error: {
                code: "UNAUTHORIZED",
                message: "Invalid token"
            }
        })
    } 
}