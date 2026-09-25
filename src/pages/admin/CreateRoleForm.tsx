import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input } from '@heroui/react';
import { roleSchema, type RoleFormValues } from './role-schema';

interface CreateRoleFormProps {
  show: boolean;
  /** Returns whether the create succeeded, so this form knows whether to reset itself. */
  onCreate: (values: RoleFormValues) => Promise<boolean>;
}

/** The collapsible "create new role" form shown above the role list. */
function CreateRoleForm({ show, onCreate }: CreateRoleFormProps) {
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  async function onSubmit(values: RoleFormValues): Promise<void> {
    const ok = await onCreate(values);
    if (ok) form.reset();
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.form
          initial={{ opacity: 0, height: 0, y: -10 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          onSubmit={form.handleSubmit(onSubmit)}
          className="mb-6 overflow-hidden"
        >
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white">
                Create new role
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Role names are normalized by the server.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="create-role-name"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Name
                </label>

                <Input
                  id="create-role-name"
                  placeholder="e.g. manager"
                  {...form.register('name')}
                  className="text-black"
                />

                {form.formState.errors.name && (
                  <p className="mt-1.5 text-xs text-red-300">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="create-role-description"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Description
                </label>

                <Input
                  id="create-role-description"
                  placeholder="Optional description"
                  {...form.register('description')}
                  className="text-black"
                />

                {form.formState.errors.description && (
                  <p className="mt-1.5 text-xs text-red-300">
                    {form.formState.errors.description?.message}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                isDisabled={form.formState.isSubmitting}
                className="bg-indigo-600 text-white hover:bg-indigo-500"
              >
                {form.formState.isSubmitting ? 'Creating…' : 'Create role'}
              </Button>
            </div>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

export default CreateRoleForm;
