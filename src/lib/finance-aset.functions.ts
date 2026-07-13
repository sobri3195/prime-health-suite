import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireFinEdit } from "./finance-guard";

const periode = z.string().regex(/^\d{4}-\d{2}$/, "Format YYYY-MM");

export const generatePenyusutan = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: { aset_id: string; from: string; to: string }) =>
    z.object({ aset_id: z.string().uuid(), from: periode, to: periode }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: n, error } = await context.supabase.rpc("fin_generate_penyusutan", {
      _aset_id: data.aset_id,
      _from_periode: data.from,
      _to_periode: data.to,
    });
    if (error) throw new Error(error.message);
    return { created: n ?? 0 };
  });

export const postPenyusutanPeriode = createServerFn({ method: "POST" })
  .middleware([requireFinEdit])
  .inputValidator((d: { periode: string }) => z.object({ periode }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: n, error } = await context.supabase.rpc("fin_post_penyusutan_periode", {
      _periode: data.periode,
    });
    if (error) throw new Error(error.message);
    return { posted: n ?? 0 };
  });
