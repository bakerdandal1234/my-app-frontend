import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, Input } from '@heroui/react';
import { permissionSchema, type PermissionFormValues } from './permission-schema';

const fields = [
  { name: 'resource', label: 'Resource', placeholder: 'e.g. roles' },
  { name: 'action', label: 'Action', placeholder: 'e.g. read' },
  { name: 'description', label: 'Description', placeholder: 'Optional description' },
] as const;

interface PermissionFormFieldsProps {
  form: UseFormReturn<PermissionFormValues>;
  idPrefix: string;
}

export function PermissionFormFields({ form, idPrefix }: PermissionFormFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map(({ name, label, placeholder }) => (
        <div key={name} className={name === 'description' ? 'md:col-span-2' : undefined}>
          <label htmlFor={`${idPrefix}-${name}`} className="mb-2 block text-sm font-medium text-slate-300">
            {label}
          </label>
          <Input
            id={`${idPrefix}-${name}`}
            placeholder={placeholder}
            {...form.register(name)}
            aria-invalid={Boolean(form.formState.errors[name])}
            aria-describedby={form.formState.errors[name] ? `${idPrefix}-${name}-error` : undefined}
            className="text-black"
          />
          {form.formState.errors[name] && (
            <p id={`${idPrefix}-${name}-error`} className="mt-1 text-xs text-red-300">
              {form.formState.errors[name]?.message}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

interface CreatePermissionFormProps {
  show: boolean;
  disabled: boolean;
  onCreate: (values: PermissionFormValues, onSaved: () => void) => Promise<void>;
}

function CreatePermissionForm({ show, disabled, onCreate }: CreatePermissionFormProps) {
  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionSchema),
    defaultValues: { resource: '', action: '', description: '' },
  });

  async function onSubmit(values: PermissionFormValues): Promise<void> {
    if (disabled) return;
    await onCreate(values, () => form.reset());
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          onSubmit={form.handleSubmit(onSubmit)}
          className="mb-6 overflow-hidden"
        >
          <fieldset disabled={disabled || form.formState.isSubmitting} className="rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-5">
            <div className="mb-4">
              <h3 className="font-medium text-white">Create permission</h3>
              <p className="mt-1 text-xs text-slate-400">Permissions follow the resource:action format.</p>
            </div>
            <PermissionFormFields form={form} idPrefix="create-permission" />
            <div className="mt-5">
              <Button
                type="submit"
                variant="primary"
                isDisabled={disabled || form.formState.isSubmitting}
                className="bg-indigo-600 text-white hover:bg-indigo-500"
              >
                {form.formState.isSubmitting ? 'Creating…' : 'Create permission'}
              </Button>
            </div>
          </fieldset>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

export default CreatePermissionForm;
