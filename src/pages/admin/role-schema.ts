import { z } from 'zod';

/** Mirrors CreateRoleDto/UpdateRoleDto — name is lowercased/trimmed server-side. */
export const roleSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be 2-50 characters.')
    .max(50, 'Name must be 2-50 characters.'),
  description: z
    .string()
    .max(255, 'Description must be at most 255 characters.')
    .optional(),
});

export type RoleFormValues = z.infer<typeof roleSchema>;
