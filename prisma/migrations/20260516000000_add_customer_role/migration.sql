DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE 'CUSTOMER';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
