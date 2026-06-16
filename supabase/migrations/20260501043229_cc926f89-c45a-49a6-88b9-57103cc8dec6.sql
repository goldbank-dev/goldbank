-- Add notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Simulate analysis queue trigger
CREATE OR REPLACE FUNCTION public.simulate_kyc_analysis()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run for new submissions
    IF (TG_OP = 'INSERT' AND NEW.status = 'under_review') THEN
        -- In a real production system, this would be an Edge Function call to an AI service
        -- or a message sent to a background worker (Redis/RabbitMQ).
        -- Here we simulate the receipt of the document.
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (NEW.user_id, 'Documentos Recebidos', 'Sua documentação foi enviada para nossa fila de análise automatizada.', 'success');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_simulate_kyc_analysis ON public.kyc_documents;
CREATE TRIGGER tr_simulate_kyc_analysis
AFTER INSERT ON public.kyc_documents
FOR EACH ROW
EXECUTE FUNCTION public.simulate_kyc_analysis();

-- Trigger to notify user when KYC status changes
CREATE OR REPLACE FUNCTION public.on_kyc_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status <> NEW.status) THEN
        IF (NEW.status = 'approved') THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (NEW.user_id, 'Conta Verificada', 'Parabéns! Sua identidade foi validada e sua conta agora é Prime.', 'success');
        ELSIF (NEW.status = 'rejected') THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (NEW.user_id, 'Verificação Rejeitada', 'Houve um problema com seus documentos. Motivo: ' || COALESCE(NEW.review_notes, 'Dados ilegíveis.'), 'error');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_on_kyc_status_change ON public.kyc_documents;
CREATE TRIGGER tr_on_kyc_status_change
AFTER UPDATE ON public.kyc_documents
FOR EACH ROW
EXECUTE FUNCTION public.on_kyc_status_change();
