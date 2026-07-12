import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Save, Shield, Building2, Bell, Plug } from "lucide-react";
import { SkeletonList } from "@/components/apps/ui";
import { getStoredTheme, setTheme as persistTheme } from "@/lib/theme";
import { useI18n, type Lang } from "@/lib/i18n";
import { getSettings, saveSetting } from "@/lib/clinic.functions";
import { toast } from "sonner";
import { friendlyError } from "@/lib/apps-error";

export const Route = createFileRoute("/_authenticated/sim-klinik/settings")({
  head: () => pageHead({ title: 'Pengaturan Klinik — SIM Klinik', description: 'Profil klinik, tarif, dan konfigurasi sistem.', path: '/sim-klinik/settings' }),
  component: SettingsPage,
});

type ProfileV = { clinicName: string; address: string; phone: string; email: string; taxId: string; bpjsCode: string };
type NotifV = { email: boolean; whatsapp: boolean; appointmentReminder: boolean; lowStock: boolean };
type SecurityV = { mfa: boolean; sessionTimeout: number; passwordRotationDays: number };
type IntegrationsV = { finance: boolean; primeApps: boolean; whatsappGateway: boolean };

function SettingsPage() {
  const qc = useQueryClient();
  const { lang, setLang } = useI18n();
  const [theme, setTh] = useState<"light" | "dark">("light");
  useEffect(() => { setTh(getStoredTheme() === "dark" ? "dark" : "light"); }, []);

  const fnGet = useServerFn(getSettings);
  const { data, isLoading } = useQuery({ queryKey: ["clinic-settings"], queryFn: () => fnGet() });

  const fnSave = useServerFn(saveSetting);
  const save = useMutation({
    mutationFn: fnSave,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clinic-settings"] }); toast.success("Pengaturan disimpan"); },
    onError: (e: Error) => toast.error(friendlyError(e, "Gagal menyimpan")),
  });

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="Settings" desc="Konfigurasi klinik." />
        <SkeletonList rows={4} />
      </div>
    );
  }

  const profile = (data.profile ?? {}) as ProfileV;
  const notif = (data.notif ?? {}) as NotifV;
  const security = (data.security ?? {}) as SecurityV;
  const integrations = (data.integrations ?? {}) as IntegrationsV;

  return (
    <div>
      <PageHeader title="Settings" desc="Konfigurasi klinik: profil, notifikasi, keamanan, integrasi, dan preferensi tampilan." />

      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile"><Building2 className="mr-1 h-3.5 w-3.5" /> Profil</TabsTrigger>
          <TabsTrigger value="notif"><Bell className="mr-1 h-3.5 w-3.5" /> Notifikasi</TabsTrigger>
          <TabsTrigger value="security"><Shield className="mr-1 h-3.5 w-3.5" /> Keamanan</TabsTrigger>
          <TabsTrigger value="integrations"><Plug className="mr-1 h-3.5 w-3.5" /> Integrasi</TabsTrigger>
          <TabsTrigger value="appearance">Tampilan</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileForm initial={profile} onSave={(v) => save.mutate({ data: { key: "profile", value: v } })} pending={save.isPending} />
        </TabsContent>

        <TabsContent value="notif">
          <NotifForm initial={notif} onSave={(v) => save.mutate({ data: { key: "notif", value: v } })} pending={save.isPending} />
        </TabsContent>

        <TabsContent value="security">
          <SecurityForm initial={security} onSave={(v) => save.mutate({ data: { key: "security", value: v } })} pending={save.isPending} />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsForm initial={integrations} onSave={(v) => save.mutate({ data: { key: "integrations", value: v } })} pending={save.isPending} />
        </TabsContent>

        <TabsContent value="appearance">
          <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-2">
            <Field label="Tema">
              <Select value={theme} onValueChange={(v) => { const t = v as "light" | "dark"; setTh(t); persistTheme(t); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Terang</SelectItem>
                  <SelectItem value="dark">Gelap</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Bahasa">
              <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="id">Bahasa Indonesia</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Badge variant="outline" className="w-fit text-xs">Preferensi tampilan disimpan lokal di perangkat</Badge>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileForm({ initial, onSave, pending }: { initial: ProfileV; onSave: (v: ProfileV) => void; pending: boolean }) {
  const [v, setV] = useState<ProfileV>(initial);
  return (
    <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-2">
      <Field label="Nama Klinik"><Input value={v.clinicName ?? ""} onChange={(e) => setV({ ...v, clinicName: e.target.value })} /></Field>
      <Field label="Telepon"><Input value={v.phone ?? ""} onChange={(e) => setV({ ...v, phone: e.target.value })} /></Field>
      <Field label="Alamat" className="md:col-span-2"><Input value={v.address ?? ""} onChange={(e) => setV({ ...v, address: e.target.value })} /></Field>
      <Field label="Email"><Input type="email" value={v.email ?? ""} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
      <Field label="NPWP"><Input value={v.taxId ?? ""} onChange={(e) => setV({ ...v, taxId: e.target.value })} /></Field>
      <Field label="Kode Faskes BPJS"><Input value={v.bpjsCode ?? ""} onChange={(e) => setV({ ...v, bpjsCode: e.target.value })} /></Field>
      <div className="md:col-span-2"><SaveBtn onClick={() => onSave(v)} pending={pending} /></div>
    </div>
  );
}

function NotifForm({ initial, onSave, pending }: { initial: NotifV; onSave: (v: NotifV) => void; pending: boolean }) {
  const [v, setV] = useState<NotifV>(initial);
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <Toggle label="Email notifikasi" v={!!v.email} onChange={(b) => setV({ ...v, email: b })} />
      <Toggle label="WhatsApp notifikasi" v={!!v.whatsapp} onChange={(b) => setV({ ...v, whatsapp: b })} />
      <Toggle label="Pengingat janji temu" v={!!v.appointmentReminder} onChange={(b) => setV({ ...v, appointmentReminder: b })} />
      <Toggle label="Alert stok obat rendah" v={!!v.lowStock} onChange={(b) => setV({ ...v, lowStock: b })} />
      <SaveBtn onClick={() => onSave(v)} pending={pending} />
    </div>
  );
}

function SecurityForm({ initial, onSave, pending }: { initial: SecurityV; onSave: (v: SecurityV) => void; pending: boolean }) {
  const [v, setV] = useState<SecurityV>(initial);
  return (
    <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-2">
      <Toggle label="Wajib MFA untuk semua admin" v={!!v.mfa} onChange={(b) => setV({ ...v, mfa: b })} />
      <Field label="Session timeout (menit)">
        <Input type="number" value={v.sessionTimeout ?? 30} onChange={(e) => setV({ ...v, sessionTimeout: Number(e.target.value) || 0 })} />
      </Field>
      <Field label="Rotasi password (hari)">
        <Input type="number" value={v.passwordRotationDays ?? 90} onChange={(e) => setV({ ...v, passwordRotationDays: Number(e.target.value) || 0 })} />
      </Field>
      <div className="md:col-span-2"><SaveBtn onClick={() => onSave(v)} pending={pending} /></div>
    </div>
  );
}

function IntegrationsForm({ initial, onSave, pending }: { initial: IntegrationsV; onSave: (v: IntegrationsV) => void; pending: boolean }) {
  const [v, setV] = useState<IntegrationsV>(initial);
  const rows: { key: keyof IntegrationsV; label: string; desc: string }[] = [
    { key: "finance", label: "Prime Simon Finance", desc: "Sinkronisasi billing → jurnal piutang & pendapatan." },
    { key: "primeApps", label: "Prime Apps Patient Portal", desc: "Push appointment, resep, dan hasil pemeriksaan ke pasien." },
    { key: "whatsappGateway", label: "WhatsApp Business Gateway", desc: "Kirim pengingat janji temu via WhatsApp." },
  ];
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <div className="text-sm font-medium">{r.label}</div>
            <div className="text-xs text-muted-foreground">{r.desc}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={v[r.key] ? "default" : "outline"}>{v[r.key] ? "Aktif" : "Nonaktif"}</Badge>
            <Switch checked={!!v[r.key]} onCheckedChange={(b) => setV({ ...v, [r.key]: b })} />
          </div>
        </div>
      ))}
      <SaveBtn onClick={() => onSave(v)} pending={pending} />
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`grid gap-1.5 ${className}`}><Label className="text-xs">{label}</Label>{children}</div>;
}

function Toggle({ label, v, onChange }: { label: string; v: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={v} onCheckedChange={onChange} />
    </div>
  );
}

function SaveBtn({ onClick, pending }: { onClick: () => void; pending: boolean }) {
  return (
    <div className="flex justify-end">
      <Button onClick={onClick} disabled={pending} className="gap-1">
        <Save className="h-4 w-4" /> {pending ? "Menyimpan…" : "Simpan"}
      </Button>
    </div>
  );
}
