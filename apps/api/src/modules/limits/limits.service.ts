import { getUserLimits } from "./limits.repository";
import { getDailySpend, getMonthlySpend } from "../../redis/counter";
import Decimal from "decimal.js";

export const checkCanProceed = async (costUSD: Decimal, userId: string) => {
    const userLimits = await getUserLimits(userId)

    const [dailySpend, monthlySpend] = await Promise.all([
        getDailySpend(userId),
        getMonthlySpend(userId)
    ])

    if (dailySpend.add(costUSD).greaterThan(userLimits.dailyLimitUSD)) {
        return { allowed: false, reason: 'Daily limit exceeded' }
    }
      
    if (monthlySpend.add(costUSD).greaterThan(userLimits.monthlyLimitUSD)) {
        return { allowed: false, reason: 'Monthly limit exceeded' }
    }
      
    return { allowed: true }
}