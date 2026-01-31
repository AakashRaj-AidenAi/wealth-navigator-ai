-- Add execution type enum for advanced order options
CREATE TYPE public.execution_type AS ENUM ('market', 'limit', 'fill_or_kill', 'good_till_cancel');

-- Add new columns to orders table for advanced order settings
ALTER TABLE public.orders 
ADD COLUMN execution_type public.execution_type DEFAULT 'market',
ADD COLUMN limit_price numeric DEFAULT NULL,
ADD COLUMN execution_price numeric DEFAULT NULL,
ADD COLUMN expires_at timestamp with time zone DEFAULT NULL;