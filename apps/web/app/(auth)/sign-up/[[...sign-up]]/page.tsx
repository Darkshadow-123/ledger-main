import { SignUp } from '@clerk/nextjs'
import { Logo } from '@/components/logo'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-background">
      <Logo size="lg" />
      <SignUp />
    </div>
  )
}