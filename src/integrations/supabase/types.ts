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
      [_ in never]: never
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
