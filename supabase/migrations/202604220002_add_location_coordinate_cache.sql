CREATE TABLE IF NOT EXISTS public.location_coordinate_cache (
    normalized_location TEXT PRIMARY KEY,
    raw_location TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    provider TEXT NOT NULL DEFAULT 'nominatim',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_location_coordinate_cache_updated_at ON public.location_coordinate_cache (updated_at DESC);

DROP TRIGGER IF EXISTS set_location_coordinate_cache_updated_at ON public.location_coordinate_cache;

CREATE TRIGGER set_location_coordinate_cache_updated_at
BEFORE UPDATE ON public.location_coordinate_cache
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.location_coordinate_cache ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.location_coordinate_cache TO authenticated;

CREATE POLICY location_coordinate_cache_select_authenticated ON public.location_coordinate_cache FOR
SELECT TO authenticated USING (true);