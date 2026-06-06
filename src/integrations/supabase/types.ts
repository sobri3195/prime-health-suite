export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      apps_ai_history: {
        Row: {
          created_at: string
          durasi: string | null
          gejala: string[] | null
          hasil: Json | null
          id: string
          keluhan: string
          nyeri: number | null
          risk: string | null
          summary: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          durasi?: string | null
          gejala?: string[] | null
          hasil?: Json | null
          id?: string
          keluhan: string
          nyeri?: number | null
          risk?: string | null
          summary?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          durasi?: string | null
          gejala?: string[] | null
          hasil?: Json | null
          id?: string
          keluhan?: string
          nyeri?: number | null
          risk?: string | null
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      apps_booking: {
        Row: {
          created_at: string
          dokter_id: string | null
          dokter_nama: string
          id: string
          jam_slot: string
          keluhan: string | null
          no_antrean: string | null
          status: string
          tanggal: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dokter_id?: string | null
          dokter_nama: string
          id?: string
          jam_slot: string
          keluhan?: string | null
          no_antrean?: string | null
          status?: string
          tanggal: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dokter_id?: string | null
          dokter_nama?: string
          id?: string
          jam_slot?: string
          keluhan?: string | null
          no_antrean?: string | null
          status?: string
          tanggal?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apps_booking_dokter_id_fkey"
            columns: ["dokter_id"]
            isOneToOne: false
            referencedRelation: "fin_dokter"
            referencedColumns: ["id"]
          },
        ]
      }
      apps_pasien: {
        Row: {
          alamat: string | null
          alergi: string | null
          created_at: string
          id: string
          jenis_kelamin: string | null
          kontak_darurat: string | null
          nama: string
          no_bpjs: string | null
          patient_code: string
          telp: string | null
          tgl_lahir: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alamat?: string | null
          alergi?: string | null
          created_at?: string
          id?: string
          jenis_kelamin?: string | null
          kontak_darurat?: string | null
          nama?: string
          no_bpjs?: string | null
          patient_code?: string
          telp?: string | null
          tgl_lahir?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alamat?: string | null
          alergi?: string | null
          created_at?: string
          id?: string
          jenis_kelamin?: string | null
          kontak_darurat?: string | null
          nama?: string
          no_bpjs?: string | null
          patient_code?: string
          telp?: string | null
          tgl_lahir?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fin_coa: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_code: string | null
          type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_code?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_code?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      fin_cost_center: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          pic: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          pic?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          pic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fin_dokter: {
        Row: {
          code: string
          created_at: string
          default_fee_pct: number
          id: string
          is_active: boolean
          is_ptkp_k0: boolean
          name: string
          npwp: string | null
          spesialisasi: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_fee_pct?: number
          id?: string
          is_active?: boolean
          is_ptkp_k0?: boolean
          name: string
          npwp?: string | null
          spesialisasi?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_fee_pct?: number
          id?: string
          is_active?: boolean
          is_ptkp_k0?: boolean
          name?: string
          npwp?: string | null
          spesialisasi?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fin_invoice: {
        Row: {
          apps_user_id: string | null
          catatan: string | null
          created_at: string
          dokter_id: string | null
          id: string
          kasir: string | null
          no_invoice: string
          pajak: number
          patient_code: string
          patient_name: string | null
          payer_id: string | null
          status: string
          subtotal: number
          tanggal: string
          total: number
          updated_at: string
        }
        Insert: {
          apps_user_id?: string | null
          catatan?: string | null
          created_at?: string
          dokter_id?: string | null
          id?: string
          kasir?: string | null
          no_invoice: string
          pajak?: number
          patient_code: string
          patient_name?: string | null
          payer_id?: string | null
          status?: string
          subtotal?: number
          tanggal?: string
          total?: number
          updated_at?: string
        }
        Update: {
          apps_user_id?: string | null
          catatan?: string | null
          created_at?: string
          dokter_id?: string | null
          id?: string
          kasir?: string | null
          no_invoice?: string
          pajak?: number
          patient_code?: string
          patient_name?: string | null
          payer_id?: string | null
          status?: string
          subtotal?: number
          tanggal?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_invoice_dokter_id_fkey"
            columns: ["dokter_id"]
            isOneToOne: false
            referencedRelation: "fin_dokter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_invoice_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "fin_payer"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_invoice_item: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          layanan_id: string | null
          layanan_nama: string
          qty: number
          subtotal: number
          tarif: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          layanan_id?: string | null
          layanan_nama: string
          qty?: number
          subtotal?: number
          tarif?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          layanan_id?: string | null
          layanan_nama?: string
          qty?: number
          subtotal?: number
          tarif?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_invoice_item_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "fin_invoice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_invoice_item_layanan_id_fkey"
            columns: ["layanan_id"]
            isOneToOne: false
            referencedRelation: "fin_layanan"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_karyawan: {
        Row: {
          code: string
          created_at: string
          gaji_pokok: number
          id: string
          is_active: boolean
          jabatan: string | null
          name: string
          npwp: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          gaji_pokok?: number
          id?: string
          is_active?: boolean
          jabatan?: string | null
          name: string
          npwp?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          gaji_pokok?: number
          id?: string
          is_active?: boolean
          jabatan?: string | null
          name?: string
          npwp?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fin_kategori_layanan: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      fin_layanan: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_kena_pajak: boolean
          kategori_code: string | null
          name: string
          tarif: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_kena_pajak?: boolean
          kategori_code?: string | null
          name: string
          tarif?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_kena_pajak?: boolean
          kategori_code?: string | null
          name?: string
          tarif?: number
          updated_at?: string
        }
        Relationships: []
      }
      fin_payer: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          term_hari: number
          tipe: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          term_hari?: number
          tipe: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          term_hari?: number
          tipe?: string
          updated_at?: string
        }
        Relationships: []
      }
      fin_pembayaran: {
        Row: {
          bank: string | null
          created_at: string
          id: string
          invoice_id: string
          jumlah: number
          mdr: number
          metode: string
          netto: number
          no_kartu_last4: string | null
          tanggal: string
        }
        Insert: {
          bank?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          jumlah?: number
          mdr?: number
          metode?: string
          netto?: number
          no_kartu_last4?: string | null
          tanggal?: string
        }
        Update: {
          bank?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          jumlah?: number
          mdr?: number
          metode?: string
          netto?: number
          no_kartu_last4?: string | null
          tanggal?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_pembayaran_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "fin_invoice"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_profil_klinik: {
        Row: {
          alamat: string | null
          created_at: string
          email: string | null
          id: string
          kota: string | null
          logo_url: string | null
          nama: string
          npwp: string | null
          telp: string | null
          updated_at: string
        }
        Insert: {
          alamat?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kota?: string | null
          logo_url?: string | null
          nama: string
          npwp?: string | null
          telp?: string | null
          updated_at?: string
        }
        Update: {
          alamat?: string | null
          created_at?: string
          email?: string | null
          id?: string
          kota?: string | null
          logo_url?: string | null
          nama?: string
          npwp?: string | null
          telp?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fin_tarif_pajak: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          jenis: string
          name: string
          tarif_pct: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          jenis: string
          name: string
          tarif_pct: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          jenis?: string
          name?: string
          tarif_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      fin_vendor: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          kategori: string | null
          name: string
          npwp: string | null
          term_hari: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          kategori?: string | null
          name: string
          npwp?: string | null
          term_hari?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kategori?: string | null
          name?: string
          npwp?: string | null
          term_hari?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      apps_slot_terisi: {
        Row: {
          dokter_id: string | null
          jam_slot: string | null
          tanggal: string | null
        }
        Insert: {
          dokter_id?: string | null
          jam_slot?: string | null
          tanggal?: string | null
        }
        Update: {
          dokter_id?: string | null
          jam_slot?: string | null
          tanggal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apps_booking_dokter_id_fkey"
            columns: ["dokter_id"]
            isOneToOne: false
            referencedRelation: "fin_dokter"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
