-- Supabase Schema for Google Maps Places Scraper
-- Run this in the Supabase SQL Editor

-- Table to store search queries and their parameters
CREATE TABLE IF NOT EXISTS search_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    query_type TEXT NOT NULL DEFAULT 'text_search', -- 'text_search', 'nearby_search'
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    radius INTEGER, -- in meters
    included_type TEXT, -- place type filter
    min_rating DECIMAL(2, 1),
    price_levels TEXT[], -- array of price levels
    open_now BOOLEAN DEFAULT false,
    page_size INTEGER DEFAULT 20,
    region_code TEXT DEFAULT 'us',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store scraped places data
CREATE TABLE IF NOT EXISTS places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id TEXT UNIQUE NOT NULL, -- Google Place ID
    display_name TEXT,
    formatted_address TEXT,
    short_address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    types TEXT[],
    primary_type TEXT,
    rating DECIMAL(2, 1),
    user_rating_count INTEGER,
    price_level TEXT,
    website_uri TEXT,
    phone_number TEXT,
    google_maps_uri TEXT,
    business_status TEXT,
    open_now BOOLEAN,
    opening_hours JSONB,
    photos JSONB,
    reviews JSONB,
    editorial_summary TEXT,
    raw_data JSONB, -- Store full API response
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table to link queries with places
CREATE TABLE IF NOT EXISTS query_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID REFERENCES search_queries(id) ON DELETE CASCADE,
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    rank_position INTEGER, -- Position in search results
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(query_id, place_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_places_place_id ON places(place_id);
CREATE INDEX IF NOT EXISTS idx_places_types ON places USING GIN(types);
CREATE INDEX IF NOT EXISTS idx_places_rating ON places(rating);
CREATE INDEX IF NOT EXISTS idx_places_location ON places(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_search_queries_created ON search_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_places_query ON query_places(query_id);
CREATE INDEX IF NOT EXISTS idx_query_places_place ON query_places(place_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
DROP TRIGGER IF EXISTS update_search_queries_updated_at ON search_queries;
CREATE TRIGGER update_search_queries_updated_at
    BEFORE UPDATE ON search_queries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_places_updated_at ON places;
CREATE TRIGGER update_places_updated_at
    BEFORE UPDATE ON places
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Disable Row Level Security (RLS) - using service_role key bypasses RLS anyway
-- If you need RLS later, change DISABLE to ENABLE and add policies
ALTER TABLE search_queries DISABLE ROW LEVEL SECURITY;
ALTER TABLE places DISABLE ROW LEVEL SECURITY;
ALTER TABLE query_places DISABLE ROW LEVEL SECURITY;

-- Note: When using service_role key, RLS is bypassed regardless of these settings
-- The policies below are commented out since RLS is disabled
-- Uncomment and modify if you re-enable RLS with anon key

/*
-- Create policies for public access (adjust for your auth requirements)
CREATE POLICY "Allow public read access to search_queries" ON search_queries
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert to search_queries" ON search_queries
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to places" ON places
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert to places" ON places
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update to places" ON places
    FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to query_places" ON query_places
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert to query_places" ON query_places
    FOR INSERT WITH CHECK (true);
*/
