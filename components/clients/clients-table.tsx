'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PlusIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon, EyeIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ClientFormDialog, type ClientEditTarget } from './client-form-dialog'
import { DeleteClientDialog } from './delete-client-dialog'
import { getInitials } from '@/lib/utils'
import { COUNTRIES } from '@/lib/constants'
import type { Client } from '@/types/database'

type ClientRow = Pick<
  Client,
  | 'id'
  | 'name'
  | 'email'
  | 'phone'
  | 'country_code'
  | 'preferred_currency'
  | 'address_line1'
  | 'address_line2'
  | 'city'
  | 'state'
  | 'postal_code'
  | 'tax_registration_number'
  | 'notes'
  | 'created_at'
> & {
  invoiceCount: number
}

interface ClientsTableProps {
  clients: ClientRow[]
}

export function ClientsTable({ clients }: ClientsTableProps) {
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ClientEditTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Pick<ClientRow, 'id' | 'name'> | null>(null)

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const countryName = (code: string | null) =>
    code ? (COUNTRIES.find((c) => c.code === code)?.name ?? code) : '—'

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          New client
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden sm:table-cell">Phone</TableHead>
              <TableHead className="hidden md:table-cell">Country</TableHead>
              <TableHead className="hidden lg:table-cell">Invoices</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-14 text-center text-muted-foreground text-sm">
                  {clients.length === 0 ? (
                    <>
                      No clients yet.{' '}
                      <button
                        className="underline underline-offset-4 hover:text-foreground"
                        onClick={() => setCreateOpen(true)}
                      >
                        Add your first client
                      </button>
                    </>
                  ) : (
                    'No clients match your search.'
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(client.name)}
                        </AvatarFallback>
                      </Avatar>
                      <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                        {client.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {client.email ?? '—'}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground text-sm sm:table-cell">
                    {client.phone ?? '—'}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground text-sm md:table-cell">
                    {countryName(client.country_code)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="secondary">{client.invoiceCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontalIcon className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}`}>
                            <EyeIcon className="h-4 w-4" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditTarget({ id: client.id, name: client.name, email: client.email, phone: client.phone, address_line1: client.address_line1, address_line2: client.address_line2, city: client.city, state: client.state, postal_code: client.postal_code, country_code: client.country_code, preferred_currency: client.preferred_currency, tax_registration_number: client.tax_registration_number, notes: client.notes })}>
                          <PencilIcon className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(client)}
                        >
                          <Trash2Icon className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <ClientFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ClientFormDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        client={editTarget ?? undefined}
      />

      <DeleteClientDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        client={deleteTarget}
      />
    </>
  )
}
