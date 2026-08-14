'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@clerk/nextjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import type { LimitsResponse } from '@/types/api'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }
  })
}

type Alert = {
  id: string
  type: string
  threshold: string
  triggered: boolean
  triggeredAt: string | null
  createdAt: string
}

const alertLabel: Record<string, string> = {
  DAILY_LIMIT_80:    'Daily spend at 80%',
  DAILY_LIMIT_100:   'Daily limit reached',
  MONTHLY_LIMIT_80:  'Monthly spend at 80%',
  MONTHLY_LIMIT_100: 'Monthly limit reached',
  ANOMALY:           'Spending anomaly detected',
}

const useAlerts = () => {
  const { isSignedIn, getToken } = useAuth()
  return useQuery<{ alerts: Alert[] }>({
    queryKey: ['alerts'],
    enabled:  !!isSignedIn,
    queryFn:  async () => {
      const token = await getToken()
      const { data } = await api.get('/alerts', { headers: { Authorization: `Bearer ${token}` } })
      return data
    }
  })
}

const useLimitsData = () => {
  const { isSignedIn, getToken } = useAuth()
  return useQuery<LimitsResponse>({
    queryKey: ['limits'],
    enabled:  !!isSignedIn,
    queryFn:  async () => {
      const token = await getToken()
      const { data } = await api.get('/limits', { headers: { Authorization: `Bearer ${token}` } })
      return data
    }
  })
}

export default function SettingsPage() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  const { data: limits, isLoading: limitsLoading } = useLimitsData()
  const { data: alertsData, isLoading: alertsLoading } = useAlerts()

  const [dailyLimit,   setDailyLimit]   = useState('')
  const [monthlyLimit, setMonthlyLimit] = useState('')
  const [editing,      setEditing]      = useState(false)

  const updateLimits = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      const body: Record<string, string> = {}
      if (dailyLimit)   body.dailyLimitUSD   = dailyLimit
      if (monthlyLimit) body.monthlyLimitUSD = monthlyLimit
      await api.patch('/limits', body, { headers: { Authorization: `Bearer ${token}` } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['limits'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      setEditing(false)
      setDailyLimit('')
      setMonthlyLimit('')
      toast.success('Limits updated')
    },
    onError: () => toast.error('Failed to update limits')
  })

  const resolveAlert = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      await api.patch(`/alerts/${id}/resolve`, {}, { headers: { Authorization: `Bearer ${token}` } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Alert resolved')
    },
    onError: () => toast.error('Failed to resolve alert')
  })

  const handleEditStart = () => {
    if (limits) {
      setDailyLimit(parseFloat(limits.daily.limit).toFixed(2))
      setMonthlyLimit(parseFloat(limits.monthly.limit).toFixed(2))
    }
    setEditing(true)
  }

  const handleSave = () => {
    if (!dailyLimit && !monthlyLimit) {
      toast.error('Enter at least one limit value')
      return
    }
    updateLimits.mutate()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your spending limits and alerts</p>
      </motion.div>

      <div className="space-y-6 max-w-2xl">

        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible"
          className="rounded-lg border border-border bg-card"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Spending limits</p>
              <p className="text-xs text-muted-foreground mt-0.5">Set daily and monthly caps for AI spend</p>
            </div>
            {!editing && (
              <button onClick={handleEditStart} className="text-xs text-primary hover:opacity-80 transition-opacity">
                Edit
              </button>
            )}
          </div>

          <div className="p-5">
            {limitsLoading ? (
              <div className="space-y-3">
                <div className="h-8 bg-border rounded animate-pulse" />
                <div className="h-8 bg-border rounded animate-pulse" />
              </div>
            ) : editing ? (
              <div className="space-y-3">
                {[
                  { label: 'Daily limit (USD)',   value: dailyLimit,   onChange: setDailyLimit,   placeholder: '5.00' },
                  { label: 'Monthly limit (USD)', value: monthlyLimit, onChange: setMonthlyLimit, placeholder: '50.00' },
                ].map(({ label, value, onChange, placeholder }) => (
                  <div key={label}>
                    <label className="text-xs text-muted-foreground block mb-1.5">{label}</label>
                    <input
                      type="number"
                      value={value}
                      onChange={e => onChange(e.target.value)}
                      placeholder={placeholder}
                      step="0.01"
                      min="0"
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors font-mono"
                    />
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={updateLimits.isPending}
                    className="text-xs bg-primary text-primary-foreground px-4 py-1.5 rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {updateLimits.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-4 py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : limits ? (
              <div className="space-y-1">
                {[
                  { label: 'Daily limit',   value: `$${parseFloat(limits.daily.limit).toFixed(2)}` },
                  { label: 'Monthly limit', value: `$${parseFloat(limits.monthly.limit).toFixed(2)}` },
                ].map(({ label, value }, i) => (
                  <div key={label}>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-sm font-mono font-medium text-foreground">{value}</span>
                    </div>
                    {i === 0 && <div className="h-px bg-border" />}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </motion.div>

        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible"
          className="rounded-lg border border-border bg-card"
        >
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-medium text-foreground">Alerts</p>
            <p className="text-xs text-muted-foreground mt-0.5">Active alerts triggered by your spending</p>
          </div>

          <div className="divide-y divide-border">
            {alertsLoading ? (
              <div className="p-5 space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-10 bg-border rounded animate-pulse" />
                ))}
              </div>
            ) : !alertsData?.alerts.length ? (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">No active alerts</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Alerts fire automatically when you approach your spending limits
                </p>
              </div>
            ) : (
              alertsData.alerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      alert.triggered ? 'bg-destructive' : 'bg-muted-foreground'
                    }`} />
                    <div>
                      <p className="text-sm text-foreground">{alertLabel[alert.type] ?? alert.type}</p>
                      {alert.triggeredAt && (
                        <p className="text-xs text-muted-foreground">
                          Triggered {new Date(alert.triggeredAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {alert.triggered && (
                    <button
                      onClick={() => resolveAlert.mutate(alert.id)}
                      disabled={resolveAlert.isPending}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}