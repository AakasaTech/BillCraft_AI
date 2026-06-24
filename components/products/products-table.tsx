'use client'

import { useState, useTransition } from 'react'
import { PlusIcon, PencilIcon, Trash2Icon, Package } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProductFormDialog } from './product-form-dialog'
import { deleteProductAction } from '@/app/actions/products'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types/database'

interface ProductsTableProps {
  products:        Product[]
  defaultCurrency: string
}

export function ProductsTable({ products, defaultCurrency }: ProductsTableProps) {
  const [search,      setSearch]      = useState('')
  const [dialogOpen,  setDialogOpen]  = useState(false)
  const [editing,     setEditing]     = useState<Product | null>(null)
  const [isPending,   startTransition] = useTransition()

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => { setEditing(null); setDialogOpen(true) }
  const openEdit   = (p: Product) => { setEditing(p); setDialogOpen(true) }

  const handleDelete = (p: Product) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteProductAction(p.id)
      if (result.error) toast.error(result.error)
      else toast.success('Product deleted.')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={openCreate}>
          <PlusIcon className="mr-2 h-4 w-4" /> New product
        </Button>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Description</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-14 text-center text-sm text-muted-foreground">
                  {products.length === 0 ? (
                    <div className="flex flex-col items-center gap-3">
                      <Package className="h-8 w-8 text-muted-foreground/50" />
                      <p>No products yet.</p>
                      <Button size="sm" variant="outline" onClick={openCreate}>
                        <PlusIcon className="mr-2 h-4 w-4" /> Create your first product
                      </Button>
                    </div>
                  ) : 'No products match your search.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="hidden max-w-xs truncate text-sm text-muted-foreground sm:table-cell">
                    {p.description ?? '—'}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(p.unit_price, p.currency)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={p.is_active ? 'default' : 'secondary'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(p)}
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(p)}
                        disabled={isPending}
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultCurrency={defaultCurrency}
        product={editing}
      />
    </div>
  )
}
