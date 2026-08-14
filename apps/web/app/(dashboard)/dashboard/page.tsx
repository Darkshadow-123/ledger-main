'use client'

import { motion } from 'framer-motion'
import { useSummary } from '@/hooks/use-summary'
import { useEvents } from '@/hooks/use-events'
import { useWebSocket } from '@/hooks/use-websocket'
import { formatDistanceToNow } from 'date-fns'
import { getModelLabel } from '@/lib/models'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }
  })
}

const SpendCard = ({
  label, spent, limit, percentage, isApproaching, index
}: {
  label: string
  spent: string
  limit: string
  percentage: number
  isApproaching: boolean
  index: number
}) => (
  <motion.div
    custom={index}
    variants={fadeUp}
    initial="hidden"
    animate="visible"
    className="rounded-lg border border-border bg-card p-5 card-hover"
  >
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <span className={`text-xs font-mono ${
        percentage >= 100 ? 'text-destructive' :
        isApproaching ? 'text-amber-400' : 'text-muted-foreground'
      }`}>
        {percentage.toFixed(1)}%
      </span>
    </div>
    <p className="text-2xl font-mono font-medium text-foreground mb-3">
      ${parseFloat(spent).toFixed(6)}
    </p>
    <div className="w-full h-1 bg-border rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(percentage, 100)}%` }}
        transition={{ delay: 0.4 + index * 0.1, duration: 0.8, ease: 'easeOut' }}
        className={`h-full rounded-full ${
          percentage >= 100 ? 'bg-destructive' :
          isApproaching ? 'bg-amber-400' : 'bg-primary'
        }`}
      />
    </div>
    <p className="text-xs text-muted-foreground mt-2">
      of ${parseFloat(limit).toFixed(2)} limit
    </p>
  </motion.div>
)

const StatCard = ({ label, value, index }: {
  label: string
  value: string | number
  index: number
}) => (
  <motion.div
    custom={index}
    variants={fadeUp}
    initial="hidden"
    animate="visible"
    className="rounded-lg border border-border bg-card p-5"
  >
    <p className="text-xs text-muted-foreground mb-2">{label}</p>
    <p className="text-2xl font-mono font-medium text-foreground">{value}</p>
  </motion.div>
)

const SkeletonCard = ({ height }: { height: string }) => (
  <div className="rounded-lg border border-border bg-card skeleton-shimmer" style={{ height }} />
)

export default function DashboardPage() {
  useWebSocket()

  const { data: summary, isLoading: summaryLoading } = useSummary()
  const { data: eventsData, isLoading: eventsLoading } = useEvents()

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Monitor your AI spend in real time</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {summaryLoading ? (
          <>
            <SkeletonCard height="120px" />
            <SkeletonCard height="120px" />
          </>
        ) : summary ? (
          <>
            <SpendCard index={1} label="Daily spend"   spent={summary.daily.currentSpend}   limit={summary.daily.limit}   percentage={summary.daily.percentage}   isApproaching={summary.daily.isApproachingLimit} />
            <SpendCard index={2} label="Monthly spend" spent={summary.monthly.currentSpend} limit={summary.monthly.limit} percentage={summary.monthly.percentage} isApproaching={summary.monthly.isApproachingLimit} />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {summaryLoading ? (
          <>
            <SkeletonCard height="88px" />
            <SkeletonCard height="88px" />
            <SkeletonCard height="88px" />
          </>
        ) : summary ? (
          <>
            <StatCard index={3} label="Requests today"       value={summary.daily.requests} />
            <StatCard index={4} label="Tokens today"         value={summary.daily.totalTokens.toLocaleString()} />
            <StatCard index={5} label="Requests this month"  value={summary.monthly.requests} />
          </>
        ) : null}
      </div>

      <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible">
        <h2 className="text-sm font-medium text-foreground mb-3">Recent requests</h2>
        <div className="rounded-lg border border-border overflow-hidden">
          {eventsLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-4 py-3 skeleton-shimmer h-[44px]" />
              ))}
            </div>
          ) : eventsData?.events.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No requests yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Send your first prompt from the{' '}
                <a href="/playground" className="text-primary hover:underline">Playground</a>
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {eventsData?.events.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-xs font-mono bg-accent text-accent-foreground px-2 py-0.5 rounded">
                      {getModelLabel(event.model)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {event.totalTokens.toLocaleString()} tokens
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-foreground">
                      ${parseFloat(event.costUSD).toFixed(6)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}