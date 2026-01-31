-- Add new columns to clients table for conversion tracking
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS client_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS converted_from_lead_id UUID REFERENCES public.leads(id);

-- Create sequence for client codes
CREATE SEQUENCE IF NOT EXISTS client_code_seq START 1;

-- Function to generate client code
CREATE OR REPLACE FUNCTION generate_client_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_val INTEGER;
BEGIN
  next_val := nextval('client_code_seq');
  RETURN 'CL-' || LPAD(next_val::TEXT, 4, '0');
END;
$$;

-- Main automation function triggered on lead status change
CREATE OR REPLACE FUNCTION auto_convert_lead_to_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_client_id UUID;
  existing_client_id UUID;
  new_client_code TEXT;
  task_dates DATE[];
  task_titles TEXT[];
  task_descriptions TEXT[];
  i INTEGER;
BEGIN
  -- Only trigger when stage changes TO closed_won
  IF NEW.stage = 'closed_won' AND (OLD.stage IS NULL OR OLD.stage != 'closed_won') THEN
    
    -- Check if already converted
    IF NEW.converted_client_id IS NOT NULL THEN
      RETURN NEW;
    END IF;
    
    -- Check for existing client by email or phone
    SELECT id INTO existing_client_id
    FROM public.clients
    WHERE (NEW.email IS NOT NULL AND email = NEW.email)
       OR (NEW.phone IS NOT NULL AND phone = NEW.phone)
    LIMIT 1;
    
    IF existing_client_id IS NOT NULL THEN
      -- Link to existing client
      NEW.converted_client_id := existing_client_id;
      NEW.converted_at := NOW();
    ELSE
      -- Generate new client code
      new_client_code := generate_client_code();
      
      -- Create new client
      INSERT INTO public.clients (
        client_name,
        email,
        phone,
        advisor_id,
        total_assets,
        status,
        client_code,
        source,
        converted_from_lead_id
      ) VALUES (
        NEW.name,
        NEW.email,
        NEW.phone,
        NEW.assigned_to,
        COALESCE(NEW.expected_value, 0),
        'active',
        new_client_code,
        NEW.source::TEXT,
        NEW.id
      )
      RETURNING id INTO new_client_id;
      
      -- Update lead with conversion info
      NEW.converted_client_id := new_client_id;
      NEW.converted_at := NOW();
      
      -- Copy notes to client notes if present
      IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
        INSERT INTO public.client_notes (
          client_id,
          title,
          content,
          created_by
        ) VALUES (
          new_client_id,
          'Notes from Lead',
          NEW.notes,
          NEW.assigned_to
        );
      END IF;
      
      -- Copy lead activities to client activities
      INSERT INTO public.client_activities (
        client_id,
        activity_type,
        title,
        description,
        created_by,
        created_at
      )
      SELECT 
        new_client_id,
        CASE 
          WHEN activity_type = 'call' THEN 'call'::activity_type
          WHEN activity_type = 'email' THEN 'email'::activity_type
          WHEN activity_type = 'meeting' THEN 'meeting'::activity_type
          ELSE 'note'::activity_type
        END,
        title,
        description,
        created_by,
        created_at
      FROM public.lead_activities
      WHERE lead_id = NEW.id;
      
      -- Create onboarding tasks (7 tasks spread over 10 days)
      task_titles := ARRAY[
        'Complete KYC verification',
        'Conduct risk profiling assessment', 
        'Schedule goal setting meeting',
        'Collect and upload documents',
        'Prepare portfolio proposal',
        'Execute first investment',
        'Schedule initial review meeting'
      ];
      
      task_descriptions := ARRAY[
        'Verify all KYC documents and complete compliance checks for the new client.',
        'Complete risk assessment questionnaire and determine suitable investment profile.',
        'Meet with client to discuss financial goals, timeline, and priorities.',
        'Gather all required documents: ID proof, address proof, bank statements, etc.',
        'Create personalized portfolio recommendation based on risk profile and goals.',
        'Process the first investment transaction as per the agreed portfolio plan.',
        'Schedule a follow-up meeting to review portfolio and answer any questions.'
      ];
      
      task_dates := ARRAY[
        CURRENT_DATE + 1,
        CURRENT_DATE + 2,
        CURRENT_DATE + 3,
        CURRENT_DATE + 4,
        CURRENT_DATE + 6,
        CURRENT_DATE + 8,
        CURRENT_DATE + 10
      ];
      
      FOR i IN 1..7 LOOP
        INSERT INTO public.tasks (
          title,
          description,
          priority,
          status,
          due_date,
          client_id,
          trigger_type,
          assigned_to,
          created_by
        ) VALUES (
          task_titles[i],
          task_descriptions[i],
          CASE WHEN i <= 3 THEN 'high'::task_priority ELSE 'medium'::task_priority END,
          'todo'::task_status,
          task_dates[i]::TEXT,
          new_client_id,
          'new_client'::task_trigger,
          NEW.assigned_to,
          NEW.assigned_to
        );
      END LOOP;
      
      -- Log conversion activity on the lead
      INSERT INTO public.lead_activities (
        lead_id,
        activity_type,
        title,
        description,
        created_by
      ) VALUES (
        NEW.id,
        'converted',
        'Lead converted to Client automatically',
        'System automatically converted lead to client ' || new_client_code || ' upon closing as won.',
        NEW.assigned_to
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on leads table
DROP TRIGGER IF EXISTS trigger_auto_convert_lead ON public.leads;
CREATE TRIGGER trigger_auto_convert_lead
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION auto_convert_lead_to_client();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_converted_from_lead ON public.clients(converted_from_lead_id);
CREATE INDEX IF NOT EXISTS idx_clients_client_code ON public.clients(client_code);