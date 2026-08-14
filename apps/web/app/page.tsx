'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Logo } from '@/components/logo'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const features = [
  {
    label: 'Block on limit',
    desc:  '402 returned instantly. No AI call made. Money saved before it\'s spent.',
    icon:  '⛔',
    stat:  '<1ms block latency'
  },
  {
    label: 'Live spend counter',
    desc:  'Cost appears the same second the model responds. WebSocket push, zero polling.',
    icon:  '⚡',
    stat:  'Real-time via WebSocket'
  },
  {
    label: 'Instant alerts',
    desc:  'Push notification at 80% spend — not an email 5 minutes later.',
    icon:  '🔔',
    stat:  'Fires before damage is done'
  },
]

const stats = [
  { value: '<1ms',  label: 'Block latency' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '1M+',   label: 'Requests tracked' },
]

const mockEvents = [
  { model: 'gpt-4o-mini',   tokens: '1,247', cost: '$0.000187', time: '0.3s', status: 'allowed' },
  { model: 'llama-3.1-8b',  tokens: '3,891', cost: '$0.000389', time: '0.4s', status: 'allowed' },
  { model: 'gpt-4o',        tokens: '892',   cost: '$0.008920', time: '1.1s', status: 'allowed' },
  { model: 'gpt-4o-mini',   tokens: '2,103', cost: '$0.000315', time: '0.3s', status: 'blocked' },
  { model: 'mixtral-8x7b',  tokens: '1,567', cost: '$0.000234', time: '0.5s', status: 'allowed' },
]

const rotatingWords = [
  'on OpenAI',
  'on Groq',
  'on AI APIs',
  'on LLM costs',
  'on token waste',
]

const fadeUp = {
  hidden:   { opacity: 0, y: 20 },
  visible:  (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }
  })
}

const RotatingWord = () => {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % rotatingWords.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <span className="relative inline-block overflow-hidden h-[1.2em] align-bottom">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%',   opacity: 1 }}
          exit={{    y: '-100%', opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
          className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400"
        >
          {rotatingWords[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

const LiveCounter = () => {
  const [spend, setSpend] = useState(3.35)

  useEffect(() => {
    const interval = setInterval(() => {
      setSpend(prev => {
        const next = prev + Math.random() * 0.002
        return next > 3.60 ? 3.35 : next
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.span
      key={spend.toFixed(4)}
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      className="text-xs font-mono text-foreground whitespace-nowrap"
    >
      ${spend.toFixed(4)} / $5.00
    </motion.span>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden font-sans">
      <div className="gradient-orb-1" />
      <div className="gradient-orb-2" />

      <nav className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-border backdrop-blur-sm bg-background/80 sticky top-0">
        <Logo size="md" />
        <div className="flex items-center gap-1">
          <Link
            href="/sign-in"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-md hover:bg-accent/50"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:opacity-90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95"
          >
            Get started
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-8 py-20 gap-6">

        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 border border-primary/30 bg-primary/5 rounded-full px-3 py-1 text-xs text-primary font-mono"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block live-pulse" />
          AI cost enforcement, in real time
        </motion.div>

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-5xl sm:text-6xl font-semibold tracking-tight max-w-2xl leading-tight text-foreground font-sans"
          style={{ fontFamily: 'var(--font-geist-sans)' }}
        >
          Stop burning money
          <br />
          <RotatingWord />
        </motion.h1>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-muted-foreground text-base max-w-sm leading-relaxed"
        >
          Ledger sits between your app and any AI provider. Blocks over-limit requests, tracks per-user spend, and pushes live alerts.
        </motion.p>

        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-3 mt-1"
        >
          <Link
            href="/sign-up"
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md text-sm font-medium hover:opacity-90 transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-95"
          >
            Start for free
          </Link>
          <Link
            href="/sign-in"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-6 py-2.5"
          >
            Sign in →
          </Link>
        </motion.div>

        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-10 mt-2"
        >
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-xl font-mono font-semibold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="w-full max-w-2xl mt-6 rounded-xl border border-border bg-card overflow-hidden shadow-2xl shadow-black/60"
          style={{
            boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06), 0 0 60px rgba(99,102,241,0.08)'
          }}
        >
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-surface-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
            <span className="text-xs text-muted-foreground ml-3 font-mono">
              ledger — request feed
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 live-pulse" />
              <span className="text-xs text-green-400 font-mono">live</span>
            </div>
          </div>

          <div className="divide-y divide-border">
            {mockEvents.map((event, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.12, duration: 0.35 }}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-accent/20 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    event.status === 'allowed' ? 'bg-green-400' : 'bg-destructive'
                  }`} />
                  <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                    {event.model}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {event.tokens} tokens
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-foreground">{event.cost}</span>
                  <span className="text-xs text-muted-foreground">{event.time}</span>
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded font-medium ${
                    event.status === 'allowed'
                      ? 'text-green-400 bg-green-400/10 border border-green-400/20'
                      : 'text-red-400 bg-red-400/10 border border-red-400/20'
                  }`}>
                    {event.status === 'allowed' ? '200' : '402'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-border bg-surface-1 flex items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Daily spend</span>
            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '67%' }}
                transition={{ delay: 1.4, duration: 1.2, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #6366f1, #818cf8)'
                }}
              />
            </div>
            <LiveCounter />
          </div>
        </motion.div>
      </main>

      <motion.footer
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="relative z-10 grid grid-cols-1 sm:grid-cols-3 border-t border-border"
      >
        {features.map((f, i) => (
          <motion.div
            key={i}
            whileHover={{
              backgroundColor: 'oklch(0.511 0.237 264 / 5%)',
              y: -2
            }}
            transition={{ duration: 0.2 }}
            className="relative px-8 py-6 sm:border-r border-border last:border-0 border-b sm:border-b-0 cursor-default group"
          >
            <motion.div
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: 1 }}
              transition={{ duration: 0.3 }}
              className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent origin-left"
            />
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{f.icon}</span>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">{f.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">{f.desc}</p>
                <p className="text-xs font-mono text-primary/70">{f.stat}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.footer>
    </div>
  )
}