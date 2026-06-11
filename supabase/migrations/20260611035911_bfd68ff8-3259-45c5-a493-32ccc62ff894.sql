
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid WHERE t.typname='app_role' AND e.enumlabel='admin_klinik') THEN
    ALTER TYPE public.app_role ADD VALUE 'admin_klinik';
  END IF;
END$$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid WHERE t.typname='app_role' AND e.enumlabel='perawat_optometri') THEN
    ALTER TYPE public.app_role ADD VALUE 'perawat_optometri';
  END IF;
END$$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid WHERE t.typname='app_role' AND e.enumlabel='pendaftaran') THEN
    ALTER TYPE public.app_role ADD VALUE 'pendaftaran';
  END IF;
END$$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid WHERE t.typname='app_role' AND e.enumlabel='farmasi') THEN
    ALTER TYPE public.app_role ADD VALUE 'farmasi';
  END IF;
END$$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid WHERE t.typname='app_role' AND e.enumlabel='manajemen') THEN
    ALTER TYPE public.app_role ADD VALUE 'manajemen';
  END IF;
END$$;
