import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UpgradePromptProps {
  feature:     string
  description?: string
}

export function UpgradePrompt({ feature, description }: UpgradePromptProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-20 text-center px-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-5 w-5 text-primary" />
      </div>
      <h2 className="text-lg font-semibold">{feature} requires Pro</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description ?? `${feature} is available on the Pro and Agency plans. Upgrade to unlock this feature.`}
      </p>
      <Button asChild className="mt-6">
        <Link href="/billing">Upgrade to Pro</Link>
      </Button>
    </div>
  )
}
