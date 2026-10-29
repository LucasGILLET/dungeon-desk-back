-- Recherche globale : sans accents (unaccent) et tolérante aux fautes de frappe (pg_trgm)
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
