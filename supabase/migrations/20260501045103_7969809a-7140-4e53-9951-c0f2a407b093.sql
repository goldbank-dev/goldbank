-- Update the existing token symbol from GOLD to GDK
UPDATE public.tokens SET symbol = 'GDK', name = 'GDK Token' WHERE symbol = 'GOLD';

-- Also update any description in transactions if necessary (optional but good for consistency)
UPDATE public.transactions 
SET description = REPLACE(description, 'GOLD', 'GDK') 
WHERE description LIKE '%GOLD%';
