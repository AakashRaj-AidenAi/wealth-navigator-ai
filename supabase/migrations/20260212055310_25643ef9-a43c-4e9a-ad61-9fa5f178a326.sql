-- Add 'silent_alert' to activity_type enum for logging silent client detection
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'silent_alert';

-- Add 'silent_client_followup' to task_trigger enum for auto-created tasks
ALTER TYPE public.task_trigger ADD VALUE IF NOT EXISTS 'silent_client_followup';