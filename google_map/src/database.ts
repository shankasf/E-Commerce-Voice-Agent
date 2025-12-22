import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';
import { 
  DbSearchQuery, 
  DbPlace, 
  DbQueryPlace, 
  Place 
} from './types';

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    console.warn('Supabase not configured. Data will not be persisted.');
    return null;
  }

  if (!supabase) {
    // Using service_role key to bypass RLS
    supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabase;
}

// Save a search query to the database
export async function saveSearchQuery(query: DbSearchQuery): Promise<DbSearchQuery | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('search_queries')
    .insert(query)
    .select()
    .single();

  if (error) {
    console.error('Error saving search query:', error);
    return null;
  }

  return data;
}

// Save a place to the database (upsert to handle duplicates)
export async function savePlace(place: DbPlace): Promise<DbPlace | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('places')
    .upsert(place, { 
      onConflict: 'place_id',
      ignoreDuplicates: false 
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving place:', error);
    return null;
  }

  return data;
}

// Link a query to a place
export async function linkQueryToPlace(link: DbQueryPlace): Promise<DbQueryPlace | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('query_places')
    .upsert(link, { onConflict: 'query_id,place_id' })
    .select()
    .single();

  if (error) {
    console.error('Error linking query to place:', error);
    return null;
  }

  return data;
}

// Convert API Place to DbPlace format
export function convertPlaceToDbPlace(place: Place): DbPlace {
  return {
    place_id: place.id,
    display_name: place.displayName?.text,
    formatted_address: place.formattedAddress,
    short_address: place.shortFormattedAddress,
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    types: place.types,
    primary_type: place.primaryType,
    rating: place.rating,
    user_rating_count: place.userRatingCount,
    price_level: place.priceLevel,
    website_uri: place.websiteUri,
    phone_number: place.nationalPhoneNumber || place.internationalPhoneNumber,
    google_maps_uri: place.googleMapsUri,
    business_status: place.businessStatus,
    open_now: place.currentOpeningHours?.openNow || place.regularOpeningHours?.openNow,
    opening_hours: place.regularOpeningHours,
    photos: place.photos,
    reviews: place.reviews,
    editorial_summary: place.editorialSummary?.text,
    raw_data: place
  };
}

// Save multiple places and link them to a query
export async function savePlacesFromSearch(
  queryId: string,
  places: Place[]
): Promise<void> {
  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    const dbPlace = convertPlaceToDbPlace(place);
    const savedPlace = await savePlace(dbPlace);

    if (savedPlace && savedPlace.id) {
      await linkQueryToPlace({
        query_id: queryId,
        place_id: savedPlace.id,
        rank_position: i + 1
      });
    }
  }
}

// Get all search queries with pagination
export async function getSearchQueries(
  page: number = 1,
  limit: number = 20
): Promise<{ queries: DbSearchQuery[]; total: number } | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const offset = (page - 1) * limit;

  const { data, error, count } = await client
    .from('search_queries')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching search queries:', error);
    return null;
  }

  return { queries: data || [], total: count || 0 };
}

// Get places for a specific query
export async function getPlacesForQuery(queryId: string): Promise<DbPlace[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('query_places')
    .select(`
      rank_position,
      places (*)
    `)
    .eq('query_id', queryId)
    .order('rank_position', { ascending: true });

  if (error) {
    console.error('Error fetching places for query:', error);
    return null;
  }

  return data?.map((item: any) => ({
    ...item.places,
    rank_position: item.rank_position
  })) || [];
}

// Get all places with pagination
export async function getAllPlaces(
  page: number = 1,
  limit: number = 50
): Promise<{ places: DbPlace[]; total: number } | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const offset = (page - 1) * limit;

  const { data, error, count } = await client
    .from('places')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching places:', error);
    return null;
  }

  return { places: data || [], total: count || 0 };
}

// Search places in database by name or address
export async function searchPlacesInDb(
  searchTerm: string
): Promise<DbPlace[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('places')
    .select('*')
    .or(`display_name.ilike.%${searchTerm}%,formatted_address.ilike.%${searchTerm}%`)
    .limit(50);

  if (error) {
    console.error('Error searching places:', error);
    return null;
  }

  return data;
}
