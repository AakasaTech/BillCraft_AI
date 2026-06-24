import { z } from 'zod'

export const inviteSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  role:  z.enum(['admin', 'member', 'viewer'], {
    required_error: 'Select a role',
  }),
})

export type InviteFormData = z.infer<typeof inviteSchema>
