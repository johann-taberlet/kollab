export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Kollab</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Collaborative project management
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
