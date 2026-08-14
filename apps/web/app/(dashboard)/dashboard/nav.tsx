'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/logo'
import { UserButton } from '@clerk/nextjs'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/playground', label: 'Playground' },
  { href: '/settings', label: 'Settings' },
]

export const Nav = () => {
  const pathname = usePathname()

  return (
    <aside className="fixed top-0 left-0 h-screen w-[240px] flex flex-col border-r border-border bg-sidebar px-4 py-5">
      <div className="mb-8">
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
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="pt-4 border-t border-border">
        <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-7 h-7' } }} />
      </div>
    </aside>
  )
}