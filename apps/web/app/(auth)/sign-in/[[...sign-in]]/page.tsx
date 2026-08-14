import { SignIn } from '@clerk/nextjs'
import { Logo } from '@/components/logo'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-background">
      <Logo size="lg" />
      <SignIn />
    </div>
  )
}