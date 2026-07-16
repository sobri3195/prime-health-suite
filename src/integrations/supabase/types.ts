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
          booking_id: string | null
          created_at: string
          durasi: string | null
          foto_url: string | null
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
          booking_id?: string | null
          created_at?: string
          durasi?: string | null
          foto_url?: string | null
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
          booking_id?: string | null
          created_at?: string
          durasi?: string | null
          foto_url?: string | null
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
      apps_artikel: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          is_published: boolean
          judul: string
          kategori: string
          konten: string
          published_at: string
          ringkasan: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          judul: string
          kategori?: string
          konten: string
          published_at?: string
          ringkasan?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          judul?: string
          kategori?: string
          konten?: string
          published_at?: string
          ringkasan?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      apps_artikel_rating: {
        Row: {
          artikel_id: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          artikel_id: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          artikel_id?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apps_artikel_rating_artikel_id_fkey"
            columns: ["artikel_id"]
            isOneToOne: false
            referencedRelation: "apps_artikel"
            referencedColumns: ["id"]
          },
        ]
      }
      apps_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          created_at: string
          id: string
          ip: string | null
          meta: Json | null
          resource: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          meta?: Json | null
          resource: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          meta?: Json | null
          resource?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      apps_booking: {
        Row: {
          cancel_reason: string | null
          created_at: string
          dokter_id: string | null
          dokter_nama: string
          id: string
          jam_slot: string
          keluhan: string | null
          no_antrean: string | null
          no_urut: number | null
          pasien_id: string | null
          source: string
          status: string
          tanggal: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancel_reason?: string | null
          created_at?: string
          dokter_id?: string | null
          dokter_nama: string
          id?: string
          jam_slot: string
          keluhan?: string | null
          no_antrean?: string | null
          no_urut?: number | null
          pasien_id?: string | null
          source?: string
          status?: string
          tanggal: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancel_reason?: string | null
          created_at?: string
          dokter_id?: string | null
          dokter_nama?: string
          id?: string
          jam_slot?: string
          keluhan?: string | null
          no_antrean?: string | null
          no_urut?: number | null
          pasien_id?: string | null
          source?: string
          status?: string
          tanggal?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apps_booking_dokter_id_fkey"
            columns: ["dokter_id"]
            isOneToOne: false
            referencedRelation: "fin_dokter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apps_booking_pasien_id_fkey"
            columns: ["pasien_id"]
            isOneToOne: false
            referencedRelation: "apps_pasien"
            referencedColumns: ["id"]
          },
        ]
      }
      apps_cart_item: {
        Row: {
          created_at: string
          id: string
          produk_id: string
          qty: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          produk_id: string
          qty?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          produk_id?: string
          qty?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apps_cart_item_produk_id_fkey"
            columns: ["produk_id"]
            isOneToOne: false
            referencedRelation: "apps_produk"
            referencedColumns: ["id"]
          },
        ]
      }
      apps_chat_msg: {
        Row: {
          attachment_mime: string | null
          attachment_name: string | null
          attachment_path: string | null
          body: string
          created_at: string
          id: string
          room_id: string
          sender: string
        }
        Insert: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          body: string
          created_at?: string
          id?: string
          room_id: string
          sender: string
        }
        Update: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          body?: string
          created_at?: string
          id?: string
          room_id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "apps_chat_msg_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "apps_chat_room"
            referencedColumns: ["id"]
          },
        ]
      }
      apps_chat_room: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      apps_notif: {
        Row: {
          body: string | null
          created_at: string
          deep_link: string | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          deep_link?: string | null
          id?: string
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          deep_link?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      apps_order: {
        Row: {
          alamat_kirim: string | null
          catatan: string | null
          created_at: string
          id: string
          kurir: string | null
          metode_bayar: string
          no_order: string
          resi: string | null
          status: string
          total: number
          tracking_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alamat_kirim?: string | null
          catatan?: string | null
          created_at?: string
          id?: string
          kurir?: string | null
          metode_bayar?: string
          no_order: string
          resi?: string | null
          status?: string
          total?: number
          tracking_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alamat_kirim?: string | null
          catatan?: string | null
          created_at?: string
          id?: string
          kurir?: string | null
          metode_bayar?: string
          no_order?: string
          resi?: string | null
          status?: string
          total?: number
          tracking_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      apps_order_item: {
        Row: {
          created_at: string
          harga: number
          id: string
          order_id: string
          produk_id: string
          produk_nama: string
          qty: number
          subtotal: number
        }
        Insert: {
          created_at?: string
          harga?: number
          id?: string
          order_id: string
          produk_id: string
          produk_nama: string
          qty?: number
          subtotal?: number
        }
        Update: {
          created_at?: string
          harga?: number
          id?: string
          order_id?: string
          produk_id?: string
          produk_nama?: string
          qty?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "apps_order_item_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "apps_order"
            referencedColumns: ["id"]
          },
        ]
      }
      apps_pasien: {
        Row: {
          alamat: string | null
          alergi: string | null
          consent_marketing_at: string | null
          consent_privacy_at: string | null
          created_at: string
          deletion_requested_at: string | null
          foto_url: string | null
          id: string
          insurance_name: string | null
          is_active: boolean
          jenis_kelamin: string | null
          kontak_darurat: string | null
          nama: string
          nik: string | null
          no_bpjs: string | null
          no_rm: string | null
          patient_code: string
          patient_type: string
          telp: string | null
          tgl_lahir: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          alamat?: string | null
          alergi?: string | null
          consent_marketing_at?: string | null
          consent_privacy_at?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          foto_url?: string | null
          id?: string
          insurance_name?: string | null
          is_active?: boolean
          jenis_kelamin?: string | null
          kontak_darurat?: string | null
          nama?: string
          nik?: string | null
          no_bpjs?: string | null
          no_rm?: string | null
          patient_code?: string
          patient_type?: string
          telp?: string | null
          tgl_lahir?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          alamat?: string | null
          alergi?: string | null
          consent_marketing_at?: string | null
          consent_privacy_at?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          foto_url?: string | null
          id?: string
          insurance_name?: string | null
          is_active?: boolean
          jenis_kelamin?: string | null
          kontak_darurat?: string | null
          nama?: string
          nik?: string | null
          no_bpjs?: string | null
          no_rm?: string | null
          patient_code?: string
          patient_type?: string
          telp?: string | null
          tgl_lahir?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      apps_poin: {
        Row: {
          alasan: string
          created_at: string
          delta: number
          id: string
          ref_id: string | null
          ref_type: string | null
          user_id: string
        }
        Insert: {
          alasan: string
          created_at?: string
          delta: number
          id?: string
          ref_id?: string | null
          ref_type?: string | null
          user_id: string
        }
        Update: {
          alasan?: string
          created_at?: string
          delta?: number
          id?: string
          ref_id?: string | null
          ref_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      apps_produk: {
        Row: {
          created_at: string
          deskripsi: string | null
          foto_url: string | null
          harga: number
          id: string
          is_active: boolean
          kategori: string
          kode: string
          nama: string
          stok: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deskripsi?: string | null
          foto_url?: string | null
          harga?: number
          id?: string
          is_active?: boolean
          kategori?: string
          kode: string
          nama: string
          stok?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deskripsi?: string | null
          foto_url?: string | null
          harga?: number
          id?: string
          is_active?: boolean
          kategori?: string
          kode?: string
          nama?: string
          stok?: number
          updated_at?: string
        }
        Relationships: []
      }
      apps_reward: {
        Row: {
          created_at: string
          deskripsi: string | null
          harga_poin: number
          id: string
          is_active: boolean
          kode: string
          nama: string
          stok: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deskripsi?: string | null
          harga_poin: number
          id?: string
          is_active?: boolean
          kode: string
          nama: string
          stok?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deskripsi?: string | null
          harga_poin?: number
          id?: string
          is_active?: boolean
          kode?: string
          nama?: string
          stok?: number
          updated_at?: string
        }
        Relationships: []
      }
      apps_reward_redeem: {
        Row: {
          created_at: string
          id: string
          kode_voucher: string
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kode_voucher: string
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kode_voucher?: string
          reward_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apps_reward_redeem_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "apps_reward"
            referencedColumns: ["id"]
          },
        ]
      }
      apps_ticket: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          pic: string | null
          priority: string
          reporter: string
          status: string
          subject: string
          ticket_no: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          id?: string
          pic?: string | null
          priority?: string
          reporter: string
          status?: string
          subject: string
          ticket_no: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          pic?: string | null
          priority?: string
          reporter?: string
          status?: string
          subject?: string
          ticket_no?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      apps_ticket_reply: {
        Row: {
          author_id: string
          author_label: string
          created_at: string
          id: string
          message: string
          ticket_id: string
        }
        Insert: {
          author_id: string
          author_label?: string
          created_at?: string
          id?: string
          message: string
          ticket_id: string
        }
        Update: {
          author_id?: string
          author_label?: string
          created_at?: string
          id?: string
          message?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apps_ticket_reply_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "apps_ticket"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          id: string
          ip: string | null
          meta: Json | null
          module: string
          target: string | null
          ts: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          id?: string
          ip?: string | null
          meta?: Json | null
          module: string
          target?: string | null
          ts?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          id?: string
          ip?: string | null
          meta?: Json | null
          module?: string
          target?: string | null
          ts?: string
        }
        Relationships: []
      }
      clinic_document: {
        Row: {
          doc_type: string
          id: string
          mime: string
          patient_code: string
          patient_name: string
          size_bytes: number
          storage_path: string | null
          title: string
          uploaded_at: string
          uploaded_by: string | null
          uploaded_by_email: string | null
        }
        Insert: {
          doc_type: string
          id?: string
          mime?: string
          patient_code: string
          patient_name: string
          size_bytes?: number
          storage_path?: string | null
          title: string
          uploaded_at?: string
          uploaded_by?: string | null
          uploaded_by_email?: string | null
        }
        Update: {
          doc_type?: string
          id?: string
          mime?: string
          patient_code?: string
          patient_name?: string
          size_bytes?: number
          storage_path?: string | null
          title?: string
          uploaded_at?: string
          uploaded_by?: string | null
          uploaded_by_email?: string | null
        }
        Relationships: []
      }
      clinic_setting: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      fin_aset: {
        Row: {
          akumulasi_penyusutan: number | null
          coa_akm_penyusutan: string | null
          coa_aset: string | null
          coa_beban_penyusutan: string | null
          cost_center_code: string | null
          created_at: string
          harga_perolehan: number
          id: string
          kategori: string | null
          kode: string
          metode: string | null
          nama: string
          nilai_buku: number | null
          nilai_residu: number | null
          status: string | null
          tanggal_perolehan: string
          umur_bulan: number | null
          updated_at: string
        }
        Insert: {
          akumulasi_penyusutan?: number | null
          coa_akm_penyusutan?: string | null
          coa_aset?: string | null
          coa_beban_penyusutan?: string | null
          cost_center_code?: string | null
          created_at?: string
          harga_perolehan?: number
          id?: string
          kategori?: string | null
          kode: string
          metode?: string | null
          nama: string
          nilai_buku?: number | null
          nilai_residu?: number | null
          status?: string | null
          tanggal_perolehan?: string
          umur_bulan?: number | null
          updated_at?: string
        }
        Update: {
          akumulasi_penyusutan?: number | null
          coa_akm_penyusutan?: string | null
          coa_aset?: string | null
          coa_beban_penyusutan?: string | null
          cost_center_code?: string | null
          created_at?: string
          harga_perolehan?: number
          id?: string
          kategori?: string | null
          kode?: string
          metode?: string | null
          nama?: string
          nilai_buku?: number | null
          nilai_residu?: number | null
          status?: string | null
          tanggal_perolehan?: string
          umur_bulan?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      fin_aset_penyusutan: {
        Row: {
          akumulasi: number
          aset_id: string
          beban: number
          created_at: string
          id: string
          nilai_buku: number
          periode: string
          posted: boolean | null
          tanggal: string
          updated_at: string
        }
        Insert: {
          akumulasi?: number
          aset_id: string
          beban?: number
          created_at?: string
          id?: string
          nilai_buku?: number
          periode: string
          posted?: boolean | null
          tanggal?: string
          updated_at?: string
        }
        Update: {
          akumulasi?: number
          aset_id?: string
          beban?: number
          created_at?: string
          id?: string
          nilai_buku?: number
          periode?: string
          posted?: boolean | null
          tanggal?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_aset_penyusutan_aset_id_fkey"
            columns: ["aset_id"]
            isOneToOne: false
            referencedRelation: "fin_aset"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after: Json | null
          before: Json | null
          changed_fields: string[] | null
          created_at: string
          entity: string
          entity_id: string | null
          entity_no: string | null
          id: string
          ip: string | null
          reason: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          changed_fields?: string[] | null
          created_at?: string
          entity: string
          entity_id?: string | null
          entity_no?: string | null
          id?: string
          ip?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          changed_fields?: string[] | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          entity_no?: string | null
          id?: string
          ip?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      fin_bank_statement: {
        Row: {
          bank: string
          created_at: string
          debit: number
          deskripsi: string
          id: string
          imported_batch: string | null
          imported_by: string | null
          kredit: number
          matched: boolean
          ref: string | null
          saldo: number | null
          tanggal: string
        }
        Insert: {
          bank: string
          created_at?: string
          debit?: number
          deskripsi: string
          id?: string
          imported_batch?: string | null
          imported_by?: string | null
          kredit?: number
          matched?: boolean
          ref?: string | null
          saldo?: number | null
          tanggal: string
        }
        Update: {
          bank?: string
          created_at?: string
          debit?: number
          deskripsi?: string
          id?: string
          imported_batch?: string | null
          imported_by?: string | null
          kredit?: number
          matched?: boolean
          ref?: string | null
          saldo?: number | null
          tanggal?: string
        }
        Relationships: []
      }
      fin_bukti_setor: {
        Row: {
          amount: number
          bank_coa: string
          created_at: string
          id: string
          kas_coa: string
          keterangan: string | null
          no_setor: string
          posted_at: string | null
          posted_journal_id: string | null
          ref_bank: string | null
          status: string
          tanggal: string
          updated_at: string
        }
        Insert: {
          amount?: number
          bank_coa: string
          created_at?: string
          id?: string
          kas_coa: string
          keterangan?: string | null
          no_setor: string
          posted_at?: string | null
          posted_journal_id?: string | null
          ref_bank?: string | null
          status?: string
          tanggal?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_coa?: string
          created_at?: string
          id?: string
          kas_coa?: string
          keterangan?: string | null
          no_setor?: string
          posted_at?: string | null
          posted_journal_id?: string | null
          ref_bank?: string | null
          status?: string
          tanggal?: string
          updated_at?: string
        }
        Relationships: []
      }
      fin_coa: {
        Row: {
          cash_flow_section: string | null
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
          cash_flow_section?: string | null
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
          cash_flow_section?: string | null
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
      fin_doc_seq: {
        Row: {
          next_no: number
          prefix: string
          updated_at: string
          yyyymm: string
        }
        Insert: {
          next_no?: number
          prefix: string
          updated_at?: string
          yyyymm: string
        }
        Update: {
          next_no?: number
          prefix?: string
          updated_at?: string
          yyyymm?: string
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
          phone: string | null
          schedule_note: string | null
          sip_number: string | null
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
          phone?: string | null
          schedule_note?: string | null
          sip_number?: string | null
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
          phone?: string | null
          schedule_note?: string | null
          sip_number?: string | null
          spesialisasi?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fin_expense: {
        Row: {
          bank: string | null
          coa_code: string | null
          cost_center_code: string | null
          created_at: string
          created_by: string | null
          id: string
          keterangan: string | null
          metode: string
          no_voucher: string
          pajak: number
          posted_at: string | null
          posted_journal_id: string | null
          status: string
          subtotal: number
          tanggal: string
          total: number
          updated_at: string
          vendor_id: string | null
          vendor_nama: string | null
          void_reason: string | null
        }
        Insert: {
          bank?: string | null
          coa_code?: string | null
          cost_center_code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          keterangan?: string | null
          metode?: string
          no_voucher: string
          pajak?: number
          posted_at?: string | null
          posted_journal_id?: string | null
          status?: string
          subtotal?: number
          tanggal?: string
          total?: number
          updated_at?: string
          vendor_id?: string | null
          vendor_nama?: string | null
          void_reason?: string | null
        }
        Update: {
          bank?: string | null
          coa_code?: string | null
          cost_center_code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          keterangan?: string | null
          metode?: string
          no_voucher?: string
          pajak?: number
          posted_at?: string | null
          posted_journal_id?: string | null
          status?: string
          subtotal?: number
          tanggal?: string
          total?: number
          updated_at?: string
          vendor_id?: string | null
          vendor_nama?: string | null
          void_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_expense_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "fin_vendor"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_expense_item: {
        Row: {
          coa_code: string | null
          created_at: string
          deskripsi: string
          expense_id: string
          harga: number
          id: string
          qty: number
          subtotal: number
        }
        Insert: {
          coa_code?: string | null
          created_at?: string
          deskripsi: string
          expense_id: string
          harga?: number
          id?: string
          qty?: number
          subtotal?: number
        }
        Update: {
          coa_code?: string | null
          created_at?: string
          deskripsi?: string
          expense_id?: string
          harga?: number
          id?: string
          qty?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_expense_item_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "fin_expense"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_invoice: {
        Row: {
          apps_user_id: string | null
          catatan: string | null
          created_at: string
          dibayar: number
          diskon: number
          dokter_id: string | null
          id: string
          kasir: string | null
          no_invoice: string
          pajak: number
          patient_code: string
          patient_name: string | null
          payer_id: string | null
          posted_at: string | null
          posted_journal_id: string | null
          source_visit_id: string | null
          status: string
          subtotal: number
          tanggal: string
          total: number
          updated_at: string
          void_reason: string | null
        }
        Insert: {
          apps_user_id?: string | null
          catatan?: string | null
          created_at?: string
          dibayar?: number
          diskon?: number
          dokter_id?: string | null
          id?: string
          kasir?: string | null
          no_invoice: string
          pajak?: number
          patient_code: string
          patient_name?: string | null
          payer_id?: string | null
          posted_at?: string | null
          posted_journal_id?: string | null
          source_visit_id?: string | null
          status?: string
          subtotal?: number
          tanggal?: string
          total?: number
          updated_at?: string
          void_reason?: string | null
        }
        Update: {
          apps_user_id?: string | null
          catatan?: string | null
          created_at?: string
          dibayar?: number
          diskon?: number
          dokter_id?: string | null
          id?: string
          kasir?: string | null
          no_invoice?: string
          pajak?: number
          patient_code?: string
          patient_name?: string | null
          payer_id?: string | null
          posted_at?: string | null
          posted_journal_id?: string | null
          source_visit_id?: string | null
          status?: string
          subtotal?: number
          tanggal?: string
          total?: number
          updated_at?: string
          void_reason?: string | null
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
          {
            foreignKeyName: "fin_invoice_posted_journal_id_fkey"
            columns: ["posted_journal_id"]
            isOneToOne: false
            referencedRelation: "fin_journal_entry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_invoice_posted_journal_id_fkey"
            columns: ["posted_journal_id"]
            isOneToOne: false
            referencedRelation: "fin_posting_audit"
            referencedColumns: ["journal_id"]
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
      fin_journal_entry: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          keterangan: string | null
          no_jurnal: string
          ref_id: string | null
          ref_no: string | null
          status: string
          sumber: string
          tanggal: string
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          keterangan?: string | null
          no_jurnal: string
          ref_id?: string | null
          ref_no?: string | null
          status?: string
          sumber?: string
          tanggal?: string
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          keterangan?: string | null
          no_jurnal?: string
          ref_id?: string | null
          ref_no?: string | null
          status?: string
          sumber?: string
          tanggal?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      fin_journal_line: {
        Row: {
          coa_code: string
          coa_nama: string | null
          cost_center_code: string | null
          created_at: string
          debit: number
          entry_id: string
          id: string
          keterangan: string | null
          kredit: number
          updated_at: string
        }
        Insert: {
          coa_code: string
          coa_nama?: string | null
          cost_center_code?: string | null
          created_at?: string
          debit?: number
          entry_id: string
          id?: string
          keterangan?: string | null
          kredit?: number
          updated_at?: string
        }
        Update: {
          coa_code?: string
          coa_nama?: string | null
          cost_center_code?: string | null
          created_at?: string
          debit?: number
          entry_id?: string
          id?: string
          keterangan?: string | null
          kredit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_journal_line_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "fin_journal_entry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_journal_line_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "fin_posting_audit"
            referencedColumns: ["journal_id"]
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
      fin_kas_kecil: {
        Row: {
          amount: number
          coa_lawan: string | null
          created_at: string
          id: string
          keterangan: string | null
          no_voucher: string
          penerima: string | null
          status: string
          tanggal: string
          tipe: string
          updated_at: string
        }
        Insert: {
          amount?: number
          coa_lawan?: string | null
          created_at?: string
          id?: string
          keterangan?: string | null
          no_voucher: string
          penerima?: string | null
          status?: string
          tanggal?: string
          tipe: string
          updated_at?: string
        }
        Update: {
          amount?: number
          coa_lawan?: string | null
          created_at?: string
          id?: string
          keterangan?: string | null
          no_voucher?: string
          penerima?: string | null
          status?: string
          tanggal?: string
          tipe?: string
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
      fin_mdr_rule: {
        Row: {
          bank: string | null
          coa_code: string
          created_at: string
          fixed_fee: number
          id: string
          is_active: boolean
          metode: string
          rate_pct: number
          updated_at: string
        }
        Insert: {
          bank?: string | null
          coa_code?: string
          created_at?: string
          fixed_fee?: number
          id?: string
          is_active?: boolean
          metode: string
          rate_pct?: number
          updated_at?: string
        }
        Update: {
          bank?: string | null
          coa_code?: string
          created_at?: string
          fixed_fee?: number
          id?: string
          is_active?: boolean
          metode?: string
          rate_pct?: number
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
          posted_at: string | null
          posted_journal_id: string | null
          status: string | null
          tanggal: string
          void_reason: string | null
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
          posted_at?: string | null
          posted_journal_id?: string | null
          status?: string | null
          tanggal?: string
          void_reason?: string | null
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
          posted_at?: string | null
          posted_journal_id?: string | null
          status?: string | null
          tanggal?: string
          void_reason?: string | null
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
      fin_persediaan: {
        Row: {
          coa_persediaan: string | null
          created_at: string
          harga_beli: number | null
          harga_jual: number | null
          id: string
          is_active: boolean | null
          kategori: string | null
          kode: string
          min_stok: number | null
          nama: string
          satuan: string | null
          stok: number | null
          updated_at: string
        }
        Insert: {
          coa_persediaan?: string | null
          created_at?: string
          harga_beli?: number | null
          harga_jual?: number | null
          id?: string
          is_active?: boolean | null
          kategori?: string | null
          kode: string
          min_stok?: number | null
          nama: string
          satuan?: string | null
          stok?: number | null
          updated_at?: string
        }
        Update: {
          coa_persediaan?: string | null
          created_at?: string
          harga_beli?: number | null
          harga_jual?: number | null
          id?: string
          is_active?: boolean | null
          kategori?: string | null
          kode?: string
          min_stok?: number | null
          nama?: string
          satuan?: string | null
          stok?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      fin_persediaan_mutasi: {
        Row: {
          created_at: string
          harga: number | null
          id: string
          keterangan: string | null
          persediaan_id: string
          qty: number
          ref_no: string | null
          tanggal: string
          tipe: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          harga?: number | null
          id?: string
          keterangan?: string | null
          persediaan_id: string
          qty: number
          ref_no?: string | null
          tanggal?: string
          tipe: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          harga?: number | null
          id?: string
          keterangan?: string | null
          persediaan_id?: string
          qty?: number
          ref_no?: string | null
          tanggal?: string
          tipe?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_persediaan_mutasi_persediaan_id_fkey"
            columns: ["persediaan_id"]
            isOneToOne: false
            referencedRelation: "fin_persediaan"
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
      fin_rab: {
        Row: {
          anggaran: number
          catatan: string | null
          coa_code: string
          coa_nama: string | null
          cost_center_code: string | null
          created_at: string
          id: string
          periode: string
          updated_at: string
        }
        Insert: {
          anggaran?: number
          catatan?: string | null
          coa_code: string
          coa_nama?: string | null
          cost_center_code?: string | null
          created_at?: string
          id?: string
          periode: string
          updated_at?: string
        }
        Update: {
          anggaran?: number
          catatan?: string | null
          coa_code?: string
          coa_nama?: string | null
          cost_center_code?: string | null
          created_at?: string
          id?: string
          periode?: string
          updated_at?: string
        }
        Relationships: []
      }
      fin_reconciliation: {
        Row: {
          catatan: string | null
          created_at: string
          expense_id: string | null
          id: string
          journal_line_id: string | null
          matched_by: string | null
          pembayaran_id: string | null
          selisih: number
          statement_id: string
          status: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          expense_id?: string | null
          id?: string
          journal_line_id?: string | null
          matched_by?: string | null
          pembayaran_id?: string | null
          selisih?: number
          statement_id: string
          status?: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          expense_id?: string | null
          id?: string
          journal_line_id?: string | null
          matched_by?: string | null
          pembayaran_id?: string | null
          selisih?: number
          statement_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_reconciliation_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "fin_bank_statement"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_surat_tagih: {
        Row: {
          catatan: string | null
          created_at: string
          id: string
          invoice_ids: Json | null
          no_surat: string
          payer_id: string | null
          payer_nama: string | null
          periode_dari: string | null
          periode_sampai: string | null
          status: string
          tanggal: string
          total: number | null
          updated_at: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          id?: string
          invoice_ids?: Json | null
          no_surat: string
          payer_id?: string | null
          payer_nama?: string | null
          periode_dari?: string | null
          periode_sampai?: string | null
          status?: string
          tanggal?: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          id?: string
          invoice_ids?: Json | null
          no_surat?: string
          payer_id?: string | null
          payer_nama?: string | null
          periode_dari?: string | null
          periode_sampai?: string | null
          status?: string
          tanggal?: string
          total?: number | null
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
      fin_template_invoice: {
        Row: {
          catatan: string | null
          created_at: string
          diskon: number | null
          id: string
          is_active: boolean
          kategori: string | null
          nama: string
          pajak_pct: number | null
          payer_id: string | null
          updated_at: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          diskon?: number | null
          id?: string
          is_active?: boolean
          kategori?: string | null
          nama: string
          pajak_pct?: number | null
          payer_id?: string | null
          updated_at?: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          diskon?: number | null
          id?: string
          is_active?: boolean
          kategori?: string | null
          nama?: string
          pajak_pct?: number | null
          payer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fin_template_invoice_item: {
        Row: {
          created_at: string
          id: string
          layanan_id: string | null
          layanan_nama: string
          qty: number
          tarif: number
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          layanan_id?: string | null
          layanan_nama: string
          qty?: number
          tarif?: number
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          layanan_id?: string | null
          layanan_nama?: string
          qty?: number
          tarif?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_template_invoice_item_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "fin_template_invoice"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_template_voucher: {
        Row: {
          coa_code: string | null
          cost_center_code: string | null
          created_at: string
          id: string
          is_active: boolean
          keterangan: string | null
          metode: string | null
          nama: string
          pajak_pct: number | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          coa_code?: string | null
          cost_center_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keterangan?: string | null
          metode?: string | null
          nama: string
          pajak_pct?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          coa_code?: string | null
          cost_center_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keterangan?: string | null
          metode?: string | null
          nama?: string
          pajak_pct?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      fin_template_voucher_item: {
        Row: {
          coa_code: string | null
          created_at: string
          deskripsi: string
          harga: number
          id: string
          qty: number
          template_id: string
        }
        Insert: {
          coa_code?: string | null
          created_at?: string
          deskripsi: string
          harga?: number
          id?: string
          qty?: number
          template_id: string
        }
        Update: {
          coa_code?: string | null
          created_at?: string
          deskripsi?: string
          harga?: number
          id?: string
          qty?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_template_voucher_item_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "fin_template_voucher"
            referencedColumns: ["id"]
          },
        ]
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
      hr_attendance: {
        Row: {
          catatan: string | null
          clock_in: string | null
          clock_out: string | null
          created_at: string
          employee_id: string
          id: string
          shift_id: string | null
          status: Database["public"]["Enums"]["hr_attendance_status"]
          tanggal: string
          total_jam_kerja: number | null
          updated_at: string
        }
        Insert: {
          catatan?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          shift_id?: string | null
          status?: Database["public"]["Enums"]["hr_attendance_status"]
          tanggal: string
          total_jam_kerja?: number | null
          updated_at?: string
        }
        Update: {
          catatan?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          shift_id?: string | null
          status?: Database["public"]["Enums"]["hr_attendance_status"]
          tanggal?: string
          total_jam_kerja?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_attendance_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "hr_shift"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employee: {
        Row: {
          created_at: string
          gaji_pokok: number
          id: string
          is_active: boolean
          jabatan: string | null
          karyawan_id: string | null
          nama: string
          saldo_jam_lembur: number
          shift_default_id: string | null
          tarif_lembur_per_jam: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          gaji_pokok?: number
          id?: string
          is_active?: boolean
          jabatan?: string | null
          karyawan_id?: string | null
          nama: string
          saldo_jam_lembur?: number
          shift_default_id?: string | null
          tarif_lembur_per_jam?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          gaji_pokok?: number
          id?: string
          is_active?: boolean
          jabatan?: string | null
          karyawan_id?: string | null
          nama?: string
          saldo_jam_lembur?: number
          shift_default_id?: string | null
          tarif_lembur_per_jam?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employee_karyawan_id_fkey"
            columns: ["karyawan_id"]
            isOneToOne: false
            referencedRelation: "fin_karyawan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employee_shift_default_id_fkey"
            columns: ["shift_default_id"]
            isOneToOne: false
            referencedRelation: "hr_shift"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_overtime: {
        Row: {
          alasan: string | null
          approval_note: string | null
          approved_at: string | null
          approved_by: string | null
          attendance_id: string | null
          created_at: string
          durasi_jam: number
          employee_id: string
          id: string
          jam_mulai: string
          jam_selesai: string
          mode: Database["public"]["Enums"]["hr_overtime_mode"]
          nominal: number | null
          payroll_run_id: string | null
          status: Database["public"]["Enums"]["hr_overtime_status"]
          tanggal: string
          tarif_per_jam: number | null
          updated_at: string
        }
        Insert: {
          alasan?: string | null
          approval_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attendance_id?: string | null
          created_at?: string
          durasi_jam: number
          employee_id: string
          id?: string
          jam_mulai: string
          jam_selesai: string
          mode?: Database["public"]["Enums"]["hr_overtime_mode"]
          nominal?: number | null
          payroll_run_id?: string | null
          status?: Database["public"]["Enums"]["hr_overtime_status"]
          tanggal: string
          tarif_per_jam?: number | null
          updated_at?: string
        }
        Update: {
          alasan?: string | null
          approval_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attendance_id?: string | null
          created_at?: string
          durasi_jam?: number
          employee_id?: string
          id?: string
          jam_mulai?: string
          jam_selesai?: string
          mode?: Database["public"]["Enums"]["hr_overtime_mode"]
          nominal?: number | null
          payroll_run_id?: string | null
          status?: Database["public"]["Enums"]["hr_overtime_status"]
          tanggal?: string
          tarif_per_jam?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_overtime_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "hr_attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_overtime_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_overtime_payroll_run_fk"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "hr_payroll_run"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_payroll_item: {
        Row: {
          catatan: string | null
          created_at: string
          employee_id: string
          gaji_pokok: number
          hari_alpa: number
          hari_hadir: number
          id: string
          nama_snapshot: string
          nominal_lembur: number
          payroll_run_id: string
          potongan: number
          potongan_bpjs_kes: number
          potongan_bpjs_tk: number
          potongan_pph21: number
          take_home: number
          total_jam_lembur: number
          tunjangan: number
          updated_at: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          employee_id: string
          gaji_pokok?: number
          hari_alpa?: number
          hari_hadir?: number
          id?: string
          nama_snapshot: string
          nominal_lembur?: number
          payroll_run_id: string
          potongan?: number
          potongan_bpjs_kes?: number
          potongan_bpjs_tk?: number
          potongan_pph21?: number
          take_home?: number
          total_jam_lembur?: number
          tunjangan?: number
          updated_at?: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          employee_id?: string
          gaji_pokok?: number
          hari_alpa?: number
          hari_hadir?: number
          id?: string
          nama_snapshot?: string
          nominal_lembur?: number
          payroll_run_id?: string
          potongan?: number
          potongan_bpjs_kes?: number
          potongan_bpjs_tk?: number
          potongan_pph21?: number
          take_home?: number
          total_jam_lembur?: number
          tunjangan?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_payroll_item_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_payroll_item_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "hr_payroll_run"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_payroll_run: {
        Row: {
          catatan: string | null
          created_at: string
          dibuat_oleh: string | null
          difinalisasi_at: string | null
          difinalisasi_oleh: string | null
          id: string
          periode_bulan: number
          periode_tahun: number
          status: Database["public"]["Enums"]["hr_payroll_status"]
          total_gaji: number
          total_lembur: number
          total_take_home: number
          updated_at: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          dibuat_oleh?: string | null
          difinalisasi_at?: string | null
          difinalisasi_oleh?: string | null
          id?: string
          periode_bulan: number
          periode_tahun: number
          status?: Database["public"]["Enums"]["hr_payroll_status"]
          total_gaji?: number
          total_lembur?: number
          total_take_home?: number
          updated_at?: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          dibuat_oleh?: string | null
          difinalisasi_at?: string | null
          difinalisasi_oleh?: string | null
          id?: string
          periode_bulan?: number
          periode_tahun?: number
          status?: Database["public"]["Enums"]["hr_payroll_status"]
          total_gaji?: number
          total_lembur?: number
          total_take_home?: number
          updated_at?: string
        }
        Relationships: []
      }
      hr_shift: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          jam_mulai: string
          jam_selesai: string
          nama: string
          toleransi_menit: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          jam_mulai: string
          jam_selesai: string
          nama: string
          toleransi_menit?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          jam_mulai?: string
          jam_selesai?: string
          nama?: string
          toleransi_menit?: number
          updated_at?: string
        }
        Relationships: []
      }
      klinik_diklat: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          deskripsi: string | null
          dokter_id: string | null
          galeri: Json
          id: string
          is_published: boolean
          judul: string
          pdf_url: string | null
          ringkasan: string | null
          slug: string
          tags: string[]
          tanggal: string
          updated_at: string
          views_count: number
          youtube_url: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          deskripsi?: string | null
          dokter_id?: string | null
          galeri?: Json
          id?: string
          is_published?: boolean
          judul: string
          pdf_url?: string | null
          ringkasan?: string | null
          slug: string
          tags?: string[]
          tanggal?: string
          updated_at?: string
          views_count?: number
          youtube_url?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          deskripsi?: string | null
          dokter_id?: string | null
          galeri?: Json
          id?: string
          is_published?: boolean
          judul?: string
          pdf_url?: string | null
          ringkasan?: string | null
          slug?: string
          tags?: string[]
          tanggal?: string
          updated_at?: string
          views_count?: number
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "klinik_diklat_dokter_id_fkey"
            columns: ["dokter_id"]
            isOneToOne: false
            referencedRelation: "fin_dokter"
            referencedColumns: ["id"]
          },
        ]
      }
      klinik_jadwal: {
        Row: {
          booked: number
          created_at: string
          day: string
          dokter_id: string | null
          dokter_name: string
          end_time: string
          id: string
          is_active: boolean
          poli: string
          quota: number
          start_time: string
          updated_at: string
        }
        Insert: {
          booked?: number
          created_at?: string
          day: string
          dokter_id?: string | null
          dokter_name: string
          end_time: string
          id?: string
          is_active?: boolean
          poli?: string
          quota?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          booked?: number
          created_at?: string
          day?: string
          dokter_id?: string | null
          dokter_name?: string
          end_time?: string
          id?: string
          is_active?: boolean
          poli?: string
          quota?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "klinik_jadwal_dokter_id_fkey"
            columns: ["dokter_id"]
            isOneToOne: false
            referencedRelation: "fin_dokter"
            referencedColumns: ["id"]
          },
        ]
      }
      klinik_medical_record: {
        Row: {
          alergi: string | null
          anamnesis: string | null
          created_at: string
          diagnosis: string | null
          dokter_id: string | null
          follow_up_date: string | null
          fundus: string | null
          icd10_code: string | null
          id: string
          is_final: boolean
          notes: string | null
          pasien_id: string
          riwayat_penyakit: string | null
          slit_lamp: string | null
          tindakan: string | null
          tio_od: string | null
          tio_os: string | null
          treatment_plan: string | null
          updated_at: string
          visit_id: string
          visus_od: string | null
          visus_os: string | null
        }
        Insert: {
          alergi?: string | null
          anamnesis?: string | null
          created_at?: string
          diagnosis?: string | null
          dokter_id?: string | null
          follow_up_date?: string | null
          fundus?: string | null
          icd10_code?: string | null
          id?: string
          is_final?: boolean
          notes?: string | null
          pasien_id: string
          riwayat_penyakit?: string | null
          slit_lamp?: string | null
          tindakan?: string | null
          tio_od?: string | null
          tio_os?: string | null
          treatment_plan?: string | null
          updated_at?: string
          visit_id: string
          visus_od?: string | null
          visus_os?: string | null
        }
        Update: {
          alergi?: string | null
          anamnesis?: string | null
          created_at?: string
          diagnosis?: string | null
          dokter_id?: string | null
          follow_up_date?: string | null
          fundus?: string | null
          icd10_code?: string | null
          id?: string
          is_final?: boolean
          notes?: string | null
          pasien_id?: string
          riwayat_penyakit?: string | null
          slit_lamp?: string | null
          tindakan?: string | null
          tio_od?: string | null
          tio_os?: string | null
          treatment_plan?: string | null
          updated_at?: string
          visit_id?: string
          visus_od?: string | null
          visus_os?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "klinik_medical_record_dokter_id_fkey"
            columns: ["dokter_id"]
            isOneToOne: false
            referencedRelation: "fin_dokter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klinik_medical_record_pasien_id_fkey"
            columns: ["pasien_id"]
            isOneToOne: false
            referencedRelation: "apps_pasien"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klinik_medical_record_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "klinik_visit"
            referencedColumns: ["id"]
          },
        ]
      }
      klinik_medical_record_history: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          medical_record_id: string
          pasien_id: string | null
          snapshot: Json
          visit_id: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          medical_record_id: string
          pasien_id?: string | null
          snapshot: Json
          visit_id?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          medical_record_id?: string
          pasien_id?: string | null
          snapshot?: Json
          visit_id?: string | null
        }
        Relationships: []
      }
      klinik_obat: {
        Row: {
          category: string | null
          code: string
          created_at: string
          expired_date: string | null
          id: string
          is_active: boolean
          min_stock: number
          name: string
          notes: string | null
          price: number
          stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          expired_date?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name: string
          notes?: string | null
          price?: number
          stock?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          expired_date?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          notes?: string | null
          price?: number
          stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      klinik_prescription: {
        Row: {
          created_at: string
          dispensed_at: string | null
          dispensed_by: string | null
          dokter_id: string | null
          id: string
          notes: string | null
          pasien_id: string
          status: string
          updated_at: string
          visit_id: string
        }
        Insert: {
          created_at?: string
          dispensed_at?: string | null
          dispensed_by?: string | null
          dokter_id?: string | null
          id?: string
          notes?: string | null
          pasien_id: string
          status?: string
          updated_at?: string
          visit_id: string
        }
        Update: {
          created_at?: string
          dispensed_at?: string | null
          dispensed_by?: string | null
          dokter_id?: string | null
          id?: string
          notes?: string | null
          pasien_id?: string
          status?: string
          updated_at?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "klinik_prescription_dokter_id_fkey"
            columns: ["dokter_id"]
            isOneToOne: false
            referencedRelation: "fin_dokter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klinik_prescription_pasien_id_fkey"
            columns: ["pasien_id"]
            isOneToOne: false
            referencedRelation: "apps_pasien"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klinik_prescription_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "klinik_visit"
            referencedColumns: ["id"]
          },
        ]
      }
      klinik_prescription_item: {
        Row: {
          created_at: string
          dosage: string | null
          duration: string | null
          frequency: string | null
          id: string
          instruction: string | null
          obat_id: string | null
          obat_name: string
          prescription_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instruction?: string | null
          obat_id?: string | null
          obat_name: string
          prescription_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instruction?: string | null
          obat_id?: string | null
          obat_name?: string
          prescription_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "klinik_prescription_item_obat_id_fkey"
            columns: ["obat_id"]
            isOneToOne: false
            referencedRelation: "klinik_obat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klinik_prescription_item_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "klinik_prescription"
            referencedColumns: ["id"]
          },
        ]
      }
      klinik_queue: {
        Row: {
          called_at: string | null
          counter: string | null
          created_at: string
          dokter_id: string | null
          done_at: string | null
          id: string
          pasien_id: string
          queue_date: string
          queue_no: string
          served_at: string | null
          status: string
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          called_at?: string | null
          counter?: string | null
          created_at?: string
          dokter_id?: string | null
          done_at?: string | null
          id?: string
          pasien_id: string
          queue_date?: string
          queue_no: string
          served_at?: string | null
          status?: string
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          called_at?: string | null
          counter?: string | null
          created_at?: string
          dokter_id?: string | null
          done_at?: string | null
          id?: string
          pasien_id?: string
          queue_date?: string
          queue_no?: string
          served_at?: string | null
          status?: string
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "klinik_queue_dokter_id_fkey"
            columns: ["dokter_id"]
            isOneToOne: false
            referencedRelation: "fin_dokter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klinik_queue_pasien_id_fkey"
            columns: ["pasien_id"]
            isOneToOne: false
            referencedRelation: "apps_pasien"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klinik_queue_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "klinik_visit"
            referencedColumns: ["id"]
          },
        ]
      }
      klinik_stock_movement: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          note: string | null
          obat_id: string
          quantity: number
          ref_id: string | null
          ref_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          note?: string | null
          obat_id: string
          quantity: number
          ref_id?: string | null
          ref_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          note?: string | null
          obat_id?: string
          quantity?: number
          ref_id?: string | null
          ref_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "klinik_stock_movement_obat_id_fkey"
            columns: ["obat_id"]
            isOneToOne: false
            referencedRelation: "klinik_obat"
            referencedColumns: ["id"]
          },
        ]
      }
      klinik_template_pemeriksaan: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          diagnosis: string
          icd10_code: string | null
          id: string
          is_active: boolean
          label: string
          treatment: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          diagnosis: string
          icd10_code?: string | null
          id?: string
          is_active?: boolean
          label: string
          treatment?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          diagnosis?: string
          icd10_code?: string | null
          id?: string
          is_active?: boolean
          label?: string
          treatment?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      klinik_visit: {
        Row: {
          booking_id: string | null
          chief_complaint: string | null
          created_at: string
          created_by: string | null
          dokter_id: string | null
          id: string
          notes: string | null
          pasien_id: string
          patient_type: string
          payment_status: string
          status: string
          updated_at: string
          visit_date: string
        }
        Insert: {
          booking_id?: string | null
          chief_complaint?: string | null
          created_at?: string
          created_by?: string | null
          dokter_id?: string | null
          id?: string
          notes?: string | null
          pasien_id: string
          patient_type?: string
          payment_status?: string
          status?: string
          updated_at?: string
          visit_date?: string
        }
        Update: {
          booking_id?: string | null
          chief_complaint?: string | null
          created_at?: string
          created_by?: string | null
          dokter_id?: string | null
          id?: string
          notes?: string | null
          pasien_id?: string
          patient_type?: string
          payment_status?: string
          status?: string
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "klinik_visit_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "apps_booking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klinik_visit_dokter_id_fkey"
            columns: ["dokter_id"]
            isOneToOne: false
            referencedRelation: "fin_dokter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "klinik_visit_pasien_id_fkey"
            columns: ["pasien_id"]
            isOneToOne: false
            referencedRelation: "apps_pasien"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      fin_posting_audit: {
        Row: {
          journal_id: string | null
          journal_status: string | null
          no_jurnal: string | null
          posted_at: string | null
          posted_by: string | null
          ref_id: string | null
          ref_no: string | null
          sumber: string | null
          tanggal: string | null
          total: number | null
        }
        Insert: {
          journal_id?: string | null
          journal_status?: string | null
          no_jurnal?: string | null
          posted_at?: string | null
          posted_by?: never
          ref_id?: string | null
          ref_no?: string | null
          sumber?: string | null
          tanggal?: string | null
          total?: number | null
        }
        Update: {
          journal_id?: string | null
          journal_status?: string | null
          no_jurnal?: string | null
          posted_at?: string | null
          posted_by?: never
          ref_id?: string | null
          ref_no?: string | null
          sumber?: string | null
          tanggal?: string | null
          total?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      app_health_check: {
        Args: never
        Returns: {
          detail: string
          last_activity: string
          status: string
          system: string
        }[]
      }
      apps_accept_consent: {
        Args: { _marketing?: boolean }
        Returns: undefined
      }
      apps_add_to_cart_locked: {
        Args: { _produk_id: string; _qty: number }
        Returns: undefined
      }
      apps_checkout_cart: {
        Args: { _alamat_kirim: string; _catatan: string; _metode_bayar: string }
        Returns: Json
      }
      apps_export_my_data: { Args: never; Returns: Json }
      apps_leaderboard_mingguan: {
        Args: never
        Returns: {
          is_me: boolean
          nama_mask: string
          rank: number
          total_poin: number
        }[]
      }
      apps_leaderboard_periodik: {
        Args: { _period?: string }
        Returns: {
          is_me: boolean
          nama_mask: string
          rank: number
          total_poin: number
        }[]
      }
      apps_list_doctors: {
        Args: never
        Returns: {
          code: string
          id: string
          name: string
          schedule_note: string
          spesialisasi: string
        }[]
      }
      apps_log_self_access: {
        Args: { _meta?: Json; _resource: string }
        Returns: undefined
      }
      apps_my_poin_total: { Args: never; Returns: number }
      apps_queue_position: {
        Args: { _booking_id: string }
        Returns: {
          posisi: number
          total: number
        }[]
      }
      apps_redeem_reward: {
        Args: { _reward_id: string }
        Returns: {
          kode_voucher: string
          redeem_id: string
        }[]
      }
      apps_request_account_deletion: { Args: never; Returns: undefined }
      apps_reschedule_booking_locked: {
        Args: { _id: string; _jam_slot: string; _tanggal: string }
        Returns: {
          cancel_reason: string | null
          created_at: string
          dokter_id: string | null
          dokter_nama: string
          id: string
          jam_slot: string
          keluhan: string | null
          no_antrean: string | null
          no_urut: number | null
          pasien_id: string | null
          source: string
          status: string
          tanggal: string
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "apps_booking"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      apps_revoke_marketing_consent: { Args: never; Returns: undefined }
      apps_send_booking_reminders: { Args: never; Returns: number }
      apps_slot_terisi_for: {
        Args: { _dokter_id: string; _tanggal: string }
        Returns: {
          jam_slot: string
        }[]
      }
      current_user_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      fin_can_edit: { Args: { _uid: string }; Returns: boolean }
      fin_can_view: { Args: { _uid: string }; Returns: boolean }
      fin_create_payment_locked: {
        Args: {
          _bank: string
          _invoice_id: string
          _jumlah: number
          _mdr: number
          _metode: string
          _no_kartu_last4: string
          _tanggal: string
        }
        Returns: {
          dibayar_baru: number
          id: string
          status: string
          total: number
        }[]
      }
      fin_delete_payment_locked: {
        Args: { _payment_id: string; _reason: string }
        Returns: {
          dibayar_baru: number
          invoice_id: string
          status: string
        }[]
      }
      fin_generate_penyusutan: {
        Args: { _aset_id: string; _from_periode: string; _to_periode: string }
        Returns: number
      }
      fin_next_doc_no: {
        Args: { _prefix: string; _yyyymm: string }
        Returns: string
      }
      fin_pick_mdr_rule: {
        Args: { _bank: string; _metode: string }
        Returns: {
          coa_code: string
          fixed_fee: number
          rate_pct: number
        }[]
      }
      fin_post_journal: {
        Args: {
          _keterangan: string
          _lines: Json
          _ref_id: string
          _ref_no: string
          _sumber: string
          _tanggal: string
        }
        Returns: string
      }
      fin_post_penyusutan_periode: {
        Args: { _periode: string }
        Returns: number
      }
      fin_rebuild_saldo: {
        Args: { _from: string; _to: string }
        Returns: {
          posted: number
          retried: number
          sumber: string
        }[]
      }
      fin_recon_jurnal: {
        Args: { _from: string; _to: string }
        Returns: {
          ledger_total: number
          live_count: number
          live_total: number
          posted_count: number
          posted_total: number
          selisih: number
          sumber: string
          unposted_count: number
        }[]
      }
      fin_recon_unposted: {
        Args: { _from: string; _to: string }
        Returns: {
          amount: number
          id: string
          keterangan: string
          ref_no: string
          sumber: string
          tanggal: string
        }[]
      }
      fin_report_aggregate_lines: {
        Args: { _from?: string; _to?: string }
        Returns: {
          cash_flow_section: string
          code: string
          debit: number
          kredit: number
          name: string
          type: string
        }[]
      }
      fin_reset_transactional_atomic: { Args: never; Returns: Json }
      fin_resolve_cash_bank_coa: {
        Args: { _bank: string; _metode: string }
        Returns: string
      }
      fin_reverse_journal_atomic: {
        Args: {
          _reason: string
          _ref_id: string
          _sumber: string
          _tanggal: string
        }
        Returns: number
      }
      fin_unbalanced_entries: {
        Args: { _from: string; _to: string }
        Returns: {
          entry_id: string
          no_jurnal: string
          selisih: number
          sumber: string
          tanggal: string
          total_debit: number
          total_kredit: number
        }[]
      }
      fin_void_expense_atomic: {
        Args: {
          _actor_email?: string
          _actor_id?: string
          _expense_id: string
          _reason: string
        }
        Returns: Json
      }
      fin_void_invoice_atomic: {
        Args: {
          _actor_email?: string
          _actor_id?: string
          _invoice_id: string
          _kind?: string
          _reason: string
        }
        Returns: Json
      }
      fin_void_invoice_locked: {
        Args: { _invoice_id: string; _kind?: string; _reason: string }
        Returns: {
          voided_payments: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      klinik_add_invoice_payment_locked: {
        Args: {
          _amount: number
          _bank: string
          _invoice_id: string
          _method: string
          _no_kartu_last4: string
        }
        Returns: {
          dibayar_baru: number
          status: string
        }[]
      }
      klinik_dispense_prescription_locked: {
        Args: { _id: string }
        Returns: undefined
      }
      klinik_is_admin: { Args: { _uid: string }; Returns: boolean }
      klinik_is_staff: { Args: { _uid: string }; Returns: boolean }
      klinik_next_no_rm: { Args: never; Returns: string }
      klinik_next_queue_no: {
        Args: { _counter?: string; _date?: string }
        Returns: string
      }
      klinik_queue_now_serving: {
        Args: { _date?: string }
        Returns: {
          counter: string
          dokter_nama: string
          nama: string
          no_rm: string
          queue_no: string
          status: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "dokter"
        | "perawat"
        | "kasir"
        | "pasien"
        | "admin_klinik"
        | "perawat_optometri"
        | "pendaftaran"
        | "farmasi"
        | "manajemen"
      hr_attendance_status:
        | "hadir"
        | "telat"
        | "alpa"
        | "izin"
        | "sakit"
        | "cuti"
      hr_overtime_mode: "uang" | "jam"
      hr_overtime_status: "pending" | "approved" | "rejected" | "cancelled"
      hr_payroll_status: "draft" | "final" | "paid"
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
    Enums: {
      app_role: [
        "super_admin",
        "dokter",
        "perawat",
        "kasir",
        "pasien",
        "admin_klinik",
        "perawat_optometri",
        "pendaftaran",
        "farmasi",
        "manajemen",
      ],
      hr_attendance_status: ["hadir", "telat", "alpa", "izin", "sakit", "cuti"],
      hr_overtime_mode: ["uang", "jam"],
      hr_overtime_status: ["pending", "approved", "rejected", "cancelled"],
      hr_payroll_status: ["draft", "final", "paid"],
    },
  },
} as const
