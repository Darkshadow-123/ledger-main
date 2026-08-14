import {prisma} from "../../config/prisma"

type ClerkUserCreatedEvent = {
    id: string;
    email_addresses?: {
        email_address: string;
    }[];
}

export const handleUserCreated = async (data: ClerkUserCreatedEvent) => {
    try {
        const id = data.id
        const email = data?.email_addresses?.[0]?.email_address;

        if(!id || !email){
          console.error("Invalid user.created payload:", data)
          return
        }

        await prisma.$transaction([

            prisma.user.upsert({
                where: { id },
                update: { email },
                create: { id, email }
            }),
      
            prisma.userLimit.upsert({
                where: {userId: id},
                update: {},
                create: {userId: id, dailyLimitUSD: 5.00, monthlyLimitUSD: 50.00}
            })
        ])
    
        console.log('[Auth] User synced with dailyLimit and monthlyLimit:', id)
    } catch (error) {
        console.error("Error handling user.created webhook:", error)
        throw error
    }
}