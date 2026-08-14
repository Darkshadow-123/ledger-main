'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/logo'
import { UserButton, useUser } from '@clerk/nextjs'

const links = [
  { href: '/dashboard',  label: 'Dashboard'  },
  { href: '/playground', label: 'Playground' },
  { href: '/settings',   label: 'Settings'   },
]

export const Nav = () => {
  const pathname = usePathname()
  const { user } = useUser()

  return (
    <aside className="fixed top-0 left-0 h-screen w-[240px] flex flex-col border-r border-border bg-sidebar px-4 py-5">
      <div className="mb-8 px-1">
        <Logo size="sm" />
      </div>

      <nav className="flex-1 flex flex-col gap-0.5">
        {links.map(({ href, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="pt-4 border-t border-border px-1">
        <div className="flex items-center gap-2.5">
          <UserButton />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate leading-tight">
              {user?.fullName ?? user?.firstName ?? 'User'}
            </p>
            <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}