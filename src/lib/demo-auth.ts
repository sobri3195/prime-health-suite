import { supabase } from "@/integrations/supabase/client";
import { DEMO_ACCOUNT } from "./demo-account";

export async function signInWithDemo() {
  const { data, error } = await supabase.auth.signInWithPassword(DEMO_ACCOUNT);
  if (error) throw error;
  if (!data.user || !data.session) throw new Error("Sesi demo tidak tersedia. Silakan coba lagi.");
  return data.user;
}
