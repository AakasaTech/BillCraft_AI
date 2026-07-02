import DocsSidebar from '@/components/docs/DocsSidebar'

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* Mobile: horizontal scrollable nav */}
      <div className="mb-8 overflow-x-auto rounded-xl border border-border bg-muted/30 p-3 md:hidden">
        <DocsSidebar />
      </div>

      <div className="flex gap-10 lg:gap-16">
        {/* Desktop sidebar */}
        <aside className="hidden w-52 shrink-0 md:block">
          <div className="sticky top-24">
            <DocsSidebar />
          </div>
        </aside>

        {/* Page content */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
