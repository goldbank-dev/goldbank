-- Add indices for performance optimization
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_active ON public.tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_token_price_history_token_id ON public.token_price_history(token_id);
CREATE INDEX IF NOT EXISTS idx_token_price_history_recorded_at ON public.token_price_history(recorded_at DESC);