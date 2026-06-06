import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { getStoredTheme, setTheme as persistTheme } from "@/lib/theme";
import { useI18n, type Lang } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sim-klinik/settings")({
  component: SettingsPage,
});

const LS_KEY = "sim-klinik:settings";

interface ClinicSettings {
  clinicName: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  bpjsCode: string;
  notif: { email: boolean; whatsapp: boolean; appointmentReminder: boolean; lowStock: boolean };
  security: { mfa: boolean; sessionTimeout: number; passwordRotationDays: number };
  integrations: { finance: boolean; primeApps: boolean; whatsappGateway: boolean };
}

const DEFAULTS: ClinicSettings = {
  clinicName: "Klinik Mata Prime",
  address: "Jl. Sudirman No. 88, Jakarta Selatan",
  phone: "+62 21 5550-1234",
  email: "halo@klinikmata.id",
  taxId: "01.234.567.8-901.000",
  bpjsCode: "1234567",
  notif: { email: true, whatsapp: true, appointmentReminder: true, lowStock: true },
  security: { mfa: true, sessionTimeout: 30, passwordRotationDays: 90 },
  integrations: { finance: true, primeApps: true, whatsappGateway: false },
};

function SettingsPage() {
  const { lang, setLang } = useI18n();
  const [s, setS] = useState<ClinicSettings>(DEFAULTS);
  const [theme, setTh] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setS({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {/* ignore */}
    setTh(getStoredTheme() === "dark" ? "dark" : "light");
  }, []);

  const save = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
    toast.success("Pengaturan disimpan");
  };

  const update = <K extends keyof ClinicSettings>(k: K, v: ClinicSettings[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  return (
    <div>
      <PageHeader
        title="Settings"
        desc="Konfigurasi klinik: profil, notifikasi, keamanan, integrasi, dan preferensi tampilan."
      />

      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile"><Building2 className="mr-1 h-3.5 w-3.5" /> Profil</TabsTrigger>
          <TabsTrigger value="notif"><Bell className="mr-1 h-3.5 w-3.5" /> Notifikasi</TabsTrigger>
          <TabsTrigger value="security"><Shield className="mr-1 h-3.5 w-3.5" /> Keamanan</TabsTrigger>
          <TabsTrigger value="integrations"><Plug className="mr-1 h-3.5 w-3.5" /> Integrasi</TabsTrigger>
          <TabsTrigger value="appearance">Tampilan</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-2">
            <Field label="Nama Klinik"><Input value={s.clinicName} onChange={(e) => update("clinicName", e.target.value)} /></Field>
            <Field label="Telepon"><Input value={s.phone} onChange={(e) => update("phone", e.target.value)} /></Field>
            <Field label="Alamat" className="md:col-span-2"><Input value={s.address} onChange={(e) => update("address", e.target.value)} /></Field>
            <Field label="Email"><Input type="email" value={s.email} onChange={(e) => update("email", e.target.value)} /></Field>
            <Field label="NPWP"><Input value={s.taxId} onChange={(e) => update("taxId", e.target.value)} /></Field>
            <Field label="Kode Faskes BPJS"><Input value={s.bpjsCode} onChange={(e) => update("bpjsCode", e.target.value)} /></Field>
          </div>
        </TabsContent>

        <TabsContent value="notif">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <Toggle label="Email notifikasi" v={s.notif.email} onChange={(v) => update("notif", { ...s.notif, email: v })} />
            <Toggle label="WhatsApp notifikasi" v={s.notif.whatsapp} onChange={(v) => update("notif", { ...s.notif, whatsapp: v })} />
            <Toggle label="Pengingat janji temu" v={s.notif.appointmentReminder} onChange={(v) => update("notif", { ...s.notif, appointmentReminder: v })} />
            <Toggle label="Alert stok obat rendah" v={s.notif.lowStock} onChange={(v) => update("notif", { ...s.notif, lowStock: v })} />
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-2">
            <Toggle label="Wajib MFA untuk semua admin" v={s.security.mfa} onChange={(v) => update("security", { ...s.security, mfa: v })} />
            <Field label="Session timeout (menit)">
              <Input type="number" value={s.security.sessionTimeout}
                onChange={(e) => update("security", { ...s.security, sessionTimeout: Number(e.target.value) || 0 })} />
            </Field>
            <Field label="Rotasi password (hari)">
              <Input type="number" value={s.security.passwordRotationDays}
                onChange={(e) => update("security", { ...s.security, passwordRotationDays: Number(e.target.value) || 0 })} />
            </Field>
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <Integration label="Prime Simon Finance" desc="Sinkronisasi billing → jurnal piutang & pendapatan."
              v={s.integrations.finance} onChange={(v) => update("integrations", { ...s.integrations, finance: v })} />
            <Integration label="Prime Apps Patient Portal" desc="Push appointment, resep, dan hasil pemeriksaan ke pasien."
              v={s.integrations.primeApps} onChange={(v) => update("integrations", { ...s.integrations, primeApps: v })} />
            <Integration label="WhatsApp Business Gateway" desc="Kirim pengingat janji temu via WhatsApp."
              v={s.integrations.whatsappGateway} onChange={(v) => update("integrations", { ...s.integrations, whatsappGateway: v })} />
          </div>
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
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex items-center justify-between">
        <Badge variant="outline" className="text-xs">Perubahan disimpan lokal (mock)</Badge>
        <Button onClick={save} className="gap-1"><Save className="h-4 w-4" /> Simpan Pengaturan</Button>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({ label, v, onChange }: { label: string; v: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={v} onCheckedChange={onChange} />
    </div>
  );
}

function Integration({ label, desc, v, onChange }: { label: string; desc: string; v: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={v ? "default" : "outline"}>{v ? "Aktif" : "Nonaktif"}</Badge>
        <Switch checked={v} onCheckedChange={onChange} />
      </div>
    </div>
  );
}
