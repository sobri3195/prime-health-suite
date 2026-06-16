import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormProps, type FieldValues } from "react-hook-form";
import type { ZodType } from "zod";

/**
 * Thin wrapper around react-hook-form + zod for consistent form setup.
 *
 * Usage:
 *   const form = useZodForm(mySchema, { defaultValues: { ... } });
 *   const onSubmit = form.handleSubmit(async (v) => {
 *     await withToast(() => api(v), { success: "Tersimpan" });
 *   });
 */
export function useZodForm<T extends FieldValues>(
  schema: ZodType<T>,
  options?: Omit<UseFormProps<T>, "resolver">,
) {
  return useForm<T>({
    mode: "onBlur",
    ...options,
    resolver: zodResolver(schema as never),
  });
}
