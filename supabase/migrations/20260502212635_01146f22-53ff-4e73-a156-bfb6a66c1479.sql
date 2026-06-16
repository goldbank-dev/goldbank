-- Ensure keys exist in system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('seo_metadata', '{"title": "Gold Bank | Ouro Digital & Custódia de Ativos RWA", "description": "A GoldBank é a plataforma líder em custódia física e tokenização de ouro. Invista em ativos GDK com lastro real, segurança blockchain e liquidez imediata.", "keywords": "ouro, blockchain, rwa, investimento, gdk"}'::jsonb, 'Configurações de SEO Global'),
  ('social_media', '{"og_image": "https://goldbank.com.br/og-image.jpg", "twitter_handle": "@goldbank"}'::jsonb, 'Configurações de Redes Sociais'),
  ('google_analytics_id', '"G-XXXXXX"'::jsonb, 'Google Analytics / Search Console ID')
ON CONFLICT (key) DO NOTHING;