import { z } from 'zod';

/** Shared validation for creating and editing a permission. */
export const permissionSchema = z.object({
  resource: z.string()
    .min(2, 'Resource must be 2-100 characters.')
    .max(100, 'Resource must be 2-100 characters.'),
  action: z.string()
    .min(2, 'Action must be 2-50 characters.')
    .max(50, 'Action must be 2-50 characters.'),
  description: z.string()
    .max(255, 'Description must be at most 255 characters.')
    .optional(),
});

export type PermissionFormValues = z.infer<typeof permissionSchema>;
