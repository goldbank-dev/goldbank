-- Create transfer audit events table
CREATE TABLE public.transfer_audit_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    type TEXT NOT NULL, -- 'transfer', 'deposit', 'withdrawal'
    amount NUMERIC(20, 8) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    receiver_id TEXT, -- ID or identifier of the receiver
    status TEXT NOT NULL, -- 'success', 'failed'
    error_message TEXT,
    idempotency_key TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transfer_audit_events ENABLE ROW LEVEL SECURITY;

-- Policies for transfer_audit_events
CREATE POLICY "Users can view their own audit events" 
ON public.transfer_audit_events 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create a policy for admins to view everything (assuming a role or flag in profiles)
-- For now, let's allow users to see their own. If an admin check exists, we can use it.
-- Let's check if there's an admin flag in profiles.

-- Indexing for performance
CREATE INDEX idx_transfer_audit_user_id ON public.transfer_audit_events(user_id);
CREATE INDEX idx_transfer_audit_created_at ON public.transfer_audit_events(created_at);
CREATE INDEX idx_transfer_audit_status ON public.transfer_audit_events(status);
