'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@clerk/nextjs'
import { useQueryClient } from '@tanstack/react-query'
import { useSummary } from '@/hooks/use-summary'
import { useWebSocket } from '@/hooks/use-websocket'
import { formatDistanceToNow } from 'date-fns'
import { api } from '@/lib/api'
import { MODELS, getModelLabel, type ModelValue } from '@/lib/models'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }
  })
}

const formatCost = (value: string): string => {
  const amount = Number(value)
  if (amount === 0) return '$0.000000'
  if (amount < 0.000001) return '<$0.000001'
  if (amount < 0.01) return `$${amount.toFixed(6)}`
  return `$${amount.toFixed(4)}`
}

type BillingSnapshot = {
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUSD: string
  requestId: string
  timestamp: Date
}

type RequestState = 'idle' | 'loading' | 'success' | 'blocked' | 'error'
type Model = ModelValue

const ModelBadge = ({ model }: { model: string }) => (
  <span className="text-xs font-mono bg-accent text-accent-foreground px-2 py-0.5 rounded">
    {getModelLabel(model)}
  </span>
)

const renderMarkdown = (text: string) => {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-sm font-semibold text-foreground mt-4 mb-2">
          {line.slice(4)}
        </h3>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-base font-semibold text-foreground mt-4 mb-2">
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-lg font-semibold text-foreground mt-4 mb-2">
          {line.slice(2)}
        </h1>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={i} className="list-disc pl-5 mb-3 space-y-1">
          {items.map((item, j) => (
            <li key={j} className="text-sm text-foreground leading-6">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      )
      continue
    } else if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      elements.push(
        <ol key={i} className="list-decimal pl-5 mb-3 space-y-1">
          {items.map((item, j) => (
            <li key={j} className="text-sm text-foreground leading-6">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      )
      continue
    } else if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={i} className="bg-muted rounded-lg p-4 overflow-x-auto mb-3 border border-border">
          <code className="text-xs font-mono text-foreground">
            {codeLines.join('\n')}
          </code>
        </pre>
      )
    } else if (line.startsWith('---') || line.startsWith('===')) {
      elements.push(<hr key={i} className="border-border my-4" />)
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
    } else {
      elements.push(
        <p key={i} className="text-sm text-foreground leading-7 mb-2">
          {renderInline(line)}
        </p>
      )
    }
    i++
  }

  return elements
}

const renderInline = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="font-mono text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

const BillingCard = ({ snapshot, isFree }: { snapshot: BillingSnapshot; isFree: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="rounded-lg border border-border bg-card p-4 space-y-3"
  >
    <p className="text-xs font-medium text-foreground">Billing snapshot</p>
    <div className="space-y-2">
      {[
        { label: 'Model',             value: <ModelBadge model={snapshot.model} /> },
        { label: 'Prompt tokens',     value: snapshot.promptTokens.toLocaleString() },
        { label: 'Completion tokens', value: snapshot.completionTokens.toLocaleString() },
        { label: 'Total tokens',      value: snapshot.totalTokens.toLocaleString() },
      ].map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-xs font-mono text-foreground">{value}</span>
        </div>
      ))}
      <div className="h-px bg-border" />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Cost</span>
        {isFree ? (
          <span className="text-xs font-mono font-medium text-green-400">Free</span>
        ) : (
          <span className="text-xs font-mono font-medium text-foreground">
            {formatCost(snapshot.costUSD)}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Request ID</span>
        <span className="text-xs font-mono text-muted-foreground">
          {snapshot.requestId.slice(0, 8)}...
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Time</span>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(snapshot.timestamp, { addSuffix: true })}
        </span>
      </div>
    </div>
  </motion.div>
)

const SpendMeter = ({
  summary,
  isFreeModel
}: {
  summary: ReturnType<typeof useSummary>['data']
  isFreeModel: boolean
}) => {
  if (!summary) return null
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-foreground">Current spend</p>
        {isFreeModel && (
          <span className="text-[10px] text-green-400 border border-green-400/30 bg-green-400/10 rounded px-1.5 py-0.5">
            Free tier
          </span>
        )}
      </div>
      <div className="space-y-3">
        {[
          { label: 'Daily',   data: summary.daily },
          { label: 'Monthly', data: summary.monthly },
        ].map(({ label, data }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-xs font-mono text-foreground">
                {formatCost(data.currentSpend)} / ${parseFloat(data.limit).toFixed(2)}
              </span>
            </div>
            <div className="w-full h-1 bg-border rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(data.percentage, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  data.percentage >= 100 ? 'bg-destructive' :
                  data.isApproachingLimit ? 'bg-amber-400' : 'bg-primary'
                }`}
              />
            </div>
          </div>
        ))}
      </div>
      {isFreeModel && (
        <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
          Groq requests are free. Spend meter tracks paid OpenAI usage only.
        </p>
      )}
    </div>
  )
}

export default function PlaygroundPage() {
  useWebSocket()
  const { getToken } = useAuth()
  const { data: summary } = useSummary()

  const [prompt, setPrompt]             = useState('')
  const [model, setModel]               = useState<Model>('gpt-4o-mini')
  const [state, setState]               = useState<RequestState>('idle')
  const [response, setResponse]         = useState<string | null>(null)
  const [billing, setBilling]           = useState<BillingSnapshot | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [history, setHistory]           = useState<BillingSnapshot[]>([])

  const selectedModel = MODELS.find(m => m.value === model)
  const isFreeModel   = selectedModel?.free ?? false
  const queryClient   = useQueryClient()

  const handleSend = async () => {
    if (!prompt.trim() || state === 'loading') return
    setState('loading')
    setResponse(null)
    setBilling(null)
    setErrorMessage(null)

    try {
      const token = await getToken()
      const { data } = await api.post(
        '/proxy/chat',
        { model, messages: [{ role: 'user', content: prompt.trim() }] },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const snapshot: BillingSnapshot = {
        model:            data.data.model,
        promptTokens:     data.data.usage.promptTokens,
        completionTokens: data.data.usage.completionTokens,
        totalTokens:      data.data.usage.totalTokens,
        costUSD:          data.data.costUSD,
        requestId:        data.requestId,
        timestamp:        new Date()
      }
      setResponse(data.data.content)
      setBilling(snapshot)
      setHistory(prev => [snapshot, ...prev].slice(0, 10))
      setState('success')
      setPrompt('')
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      queryClient.invalidateQueries({ queryKey: ['limits'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { error?: { message?: string } } } }
      const message = err?.response?.data?.error?.message
      if (err?.response?.status === 402) {
        setState('blocked')
        setErrorMessage(message ?? 'Spending limit exceeded')
      } else {
        setState('error')
        setErrorMessage(message ?? 'Something went wrong')
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
  }

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Playground</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Send prompts through Ledger and watch billing happen in real time
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-3 space-y-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border">
              {MODELS.map(m => (
                <button
                  key={m.value}
                  onClick={() => !m.disabled && setModel(m.value as Model)}
                  disabled={m.disabled}
                  className={`group relative min-w-[148px] rounded-xl border px-3 py-2 text-left transition-all duration-200 ${
                    m.disabled
                      ? 'border-border opacity-50 cursor-not-allowed'
                      : model === m.value
                      ? 'border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(99,102,241,0.12)]'
                      : 'border-border hover:border-primary/30 hover:bg-primary/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-medium uppercase tracking-[0.14em] ${
                      m.disabled ? 'text-muted-foreground' : 'text-primary/80'
                    }`}>
                      {m.provider}
                    </span>
                    {m.disabled ? (
                      <span className="text-[10px] text-muted-foreground border border-border rounded px-1">
                        Soon
                      </span>
                    ) : m.free ? (
                      <span className="text-[10px] text-green-400 border border-green-400/30 bg-green-400/10 rounded px-1">
                        Free
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{m.description}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-medium text-foreground">{m.label}</p>
                  {!m.disabled && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{m.description}</p>
                  )}
                </button>
              ))}
            </div>

            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a prompt..."
              rows={8}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground p-4 resize-none focus:outline-none"
            />
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">⌘ + Enter to send</span>
              <button
                onClick={handleSend}
                disabled={!prompt.trim() || state === 'loading'}
                className="inline-flex items-center justify-center min-w-[110px] text-xs bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-90 hover:shadow-[0_0_24px_rgba(99,102,241,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {state === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border border-current border-t-transparent animate-spin" />
                    Generating
                  </span>
                ) : 'Send'}
              </button>
            </div>
          </div>

          {state === 'loading' && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              {[75, 50, 62].map((w, i) => (
                <div key={i} className="h-3 bg-border rounded animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}

          {state === 'success' && response && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-sm shadow-sm"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                <div>
                  <p className="text-sm font-medium text-foreground">Response</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Generated through Ledger</p>
                </div>
                {billing && <ModelBadge model={billing.model} />}
              </div>
              <div className="px-5 py-5">
                <div className="space-y-1">
                  {renderMarkdown(response)}
                </div>
              </div>
            </motion.div>
          )}

          {(state === 'blocked' || state === 'error') && errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg border p-4 ${
                state === 'blocked' ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'
              }`}
            >
              <p className={`text-xs font-medium mb-1 ${
                state === 'blocked' ? 'text-destructive' : 'text-foreground'
              }`}>
                {state === 'blocked' ? '402 — Limit exceeded' : 'Error'}
              </p>
              <p className="text-xs text-muted-foreground">{errorMessage}</p>
            </motion.div>
          )}

          {history.length > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground mb-2">Request history</p>
              <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <ModelBadge model={h.model} />
                      <span className="text-xs text-muted-foreground">
                        {h.totalTokens.toLocaleString()} tokens
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {MODELS.find(m => m.value === h.model)?.free ? (
                        <span className="text-xs font-mono text-green-400">Free</span>
                      ) : (
                        <span className="text-xs font-mono text-foreground">{formatCost(h.costUSD)}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(h.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-2 space-y-4">
          <SpendMeter summary={summary} isFreeModel={isFreeModel} />

          {state === 'loading' && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3 animate-pulse">
              <div className="h-3 bg-border rounded w-1/2" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-2.5 bg-border rounded w-1/3" />
                    <div className="h-2.5 bg-border rounded w-1/4" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {billing && state === 'success' && (
            <BillingCard snapshot={billing} isFree={isFreeModel} />
          )}

          {!billing && state === 'idle' && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground text-center py-4">
                Billing details will appear here after your first request.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}