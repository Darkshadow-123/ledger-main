'use client'

export default function Error() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground">500</h1>
        <p className="mt-2 text-muted-foreground">Something went wrong</p>
      </div>
    </div>
  )
}