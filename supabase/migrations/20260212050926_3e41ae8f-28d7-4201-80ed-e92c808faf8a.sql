
-- Add fee_type and recurring_frequency to invoices
ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS fee_type text DEFAULT 'retainer',
  ADD COLUMN IF NOT EXISTS recurring_frequency text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL;
