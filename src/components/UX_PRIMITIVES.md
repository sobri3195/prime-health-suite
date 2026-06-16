# UX Consistency Primitives

Reusable building blocks for tables, empty/loading states, error handling, and
forms. Adopt these in every new page; refactor existing pages as you touch
them so the system converges.

## When to use

| Need                              | Use                                                      |
| --------------------------------- | -------------------------------------------------------- |
| List with search/sort/paging      | `<DataTable>` (`src/components/data-table.tsx`)          |
| Skeleton rows while loading       | `<TableSkeleton>` (auto in `<DataTable loading>`)        |
| "Belum ada data" / no results     | `<EmptyState>` (auto in `<DataTable>` when rows empty)   |
| Show error toast from a thrown e  | `handleError(e)` (`src/lib/handle-error.ts`)             |
| Wrap a mutation w/ loading toast  | `withToast(fn, { loading, success, error })`             |
| Build a validated form            | `useZodForm(schema, { defaultValues })`                  |
| Export CSV/PDF + date range bar   | `<FinanceExportBar>` (existing)                          |

## DataTable example

```tsx
import { DataTable, type DataTableColumn } from "@/components/data-table";

type Row = { id: string; nama: string; total: number; status: "paid" | "unpaid" };

const columns: DataTableColumn<Row>[] = [
  { key: "nama", header: "Nama", sortable: true },
  { key: "total", header: "Total", align: "right", sortable: true,
    cell: (r) => r.total.toLocaleString("id-ID") },
  { key: "status", header: "Status",
    cell: (r) => <Badge>{r.status}</Badge> },
];

<DataTable
  rows={rows}
  columns={columns}
  loading={isLoading}
  rowKey={(r) => r.id}
  searchPlaceholder="Cari faktur…"
  actions={<Button>Tambah</Button>}
  rightActions={(r) => <Button size="icon" variant="ghost">…</Button>}
/>
```

## Error handling

Always go through `handleError`. It logs to console (for debugging) and shows
an Indonesian-friendly toast. Common low-level messages (network/unauth/
duplicate/not-found/timeout) are mapped automatically.

```tsx
const mut = useMutation({
  mutationFn: saveFn,
  onSuccess: () => toast.success("Tersimpan"),
  onError: handleError, // ← do this
});
```

For ad-hoc async actions outside of react-query:

```tsx
await withToast(() => saveFn(payload), {
  loading: "Menyimpan…",
  success: "Tersimpan",
  // error: optional override; otherwise message comes from the thrown error
});
```

## Forms with zod

```tsx
import { useZodForm } from "@/lib/use-zod-form";
import { z } from "zod";

const schema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi").max(100),
  email: z.string().trim().email("Email tidak valid"),
});

const form = useZodForm(schema, { defaultValues: { nama: "", email: "" } });
const onSubmit = form.handleSubmit(async (v) => {
  await withToast(() => api.save(v), { success: "Tersimpan" });
});
```

Combine with shadcn `<Form>` components from `@/components/ui/form`.

## Convention checklist (every new page)

- [ ] `PageHeader` with title + 1-line desc
- [ ] `DataTable` for any list (skeleton + empty-state come free)
- [ ] All mutation `onError` → `handleError`
- [ ] All form validation via zod
- [ ] Indonesian copy on labels, buttons, toasts ("Simpan/Batal/Hapus/Cari…")
- [ ] Right-aligned numeric columns
- [ ] Confirm dialog before destructive actions
