import { clerkAppearance } from '@/lib/clerk-appearance'
import { Providers } from '@/components/providers'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata = {
  title: 'Ledger — AI Cost Enforcement',
  description: 'Track per-user OpenAI costs, enforce spending limits, and get real-time alerts.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers appearance={clerkAppearance}>
          {children}
        </Providers>
      </body>
    </html>
  )
}