import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface Crumb { label: string; href?: string }

const BASE = 'https://billcraft.aakasa.dev'

function buildSchema(crumbs: Crumb[]) {
  const all: Crumb[] = [{ label: 'Docs', href: '/docs' }, ...crumbs]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      ...all.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: c.label,
        ...(c.href ? { item: `${BASE}${c.href}` } : {}),
      })),
    ],
  }
}

export function DocsBreadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  const all: Crumb[] = [{ label: 'Docs', href: '/docs' }, ...crumbs]
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildSchema(crumbs)) }}
      />
      <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        {all.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {crumb.href && i < all.length - 1 ? (
              <Link href={crumb.href} className="hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
    </>
  )
}
