// Type definitions for Google Maps Places API and application

export interface PlaceLocation {
  latitude: number;
  longitude: number;
}

export interface PlaceViewport {
  low: PlaceLocation;
  high: PlaceLocation;
}

export interface PlaceDisplayName {
  text: string;
  languageCode?: string;
}

export interface PlaceOpeningHours {
  openNow?: boolean;
  periods?: Array<{
    open: { day: number; hour: number; minute: number };
    close?: { day: number; hour: number; minute: number };
  }>;
  weekdayDescriptions?: string[];
}

export interface PlacePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions?: Array<{
    displayName: string;
    uri?: string;
    photoUri?: string;
  }>;
}

export interface PlaceReview {
  name: string;
  relativePublishTimeDescription: string;
  rating: number;
  text?: { text: string; languageCode?: string };
  authorAttribution?: {
    displayName: string;
    uri?: string;
    photoUri?: string;
  };
  publishTime: string;
}

export interface Place {
  id: string;
  name?: string;
  displayName?: PlaceDisplayName;
  formattedAddress?: string;
  shortFormattedAddress?: string;
  location?: PlaceLocation;
  viewport?: PlaceViewport;
  types?: string[];
  primaryType?: string;
  primaryTypeDisplayName?: PlaceDisplayName;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  regularOpeningHours?: PlaceOpeningHours;
  currentOpeningHours?: PlaceOpeningHours;
  photos?: PlacePhoto[];
  reviews?: PlaceReview[];
  editorialSummary?: { text: string; languageCode?: string };
  utcOffsetMinutes?: number;
}

export interface TextSearchRequest {
  textQuery: string;
  includedType?: string;
  languageCode?: string;
  locationBias?: {
    circle?: {
      center: PlaceLocation;
      radius: number;
    };
    rectangle?: PlaceViewport;
  };
  locationRestriction?: {
    rectangle: PlaceViewport;
  };
  minRating?: number;
  openNow?: boolean;
  priceLevels?: string[];
  pageSize?: number;
  pageToken?: string;
  rankPreference?: 'RELEVANCE' | 'DISTANCE';
  regionCode?: string;
  strictTypeFiltering?: boolean;
}

export interface NearbySearchRequest {
  includedTypes?: string[];
  excludedTypes?: string[];
  languageCode?: string;
  locationRestriction: {
    circle: {
      center: PlaceLocation;
      radius: number;
    };
  };
  maxResultCount?: number;
  rankPreference?: 'POPULARITY' | 'DISTANCE';
}

export interface PlacesSearchResponse {
  places: Place[];
  nextPageToken?: string;
}

// Database types
export interface DbSearchQuery {
  id?: string;
  query_text: string;
  query_type: 'text_search' | 'nearby_search';
  location_lat?: number;
  location_lng?: number;
  radius?: number;
  included_type?: string;
  min_rating?: number;
  price_levels?: string[];
  open_now?: boolean;
  page_size?: number;
  region_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbPlace {
  id?: string;
  place_id: string;
  display_name?: string;
  formatted_address?: string;
  short_address?: string;
  latitude?: number;
  longitude?: number;
  types?: string[];
  primary_type?: string;
  rating?: number;
  user_rating_count?: number;
  price_level?: string;
  website_uri?: string;
  phone_number?: string;
  google_maps_uri?: string;
  business_status?: string;
  open_now?: boolean;
  opening_hours?: PlaceOpeningHours;
  photos?: PlacePhoto[];
  reviews?: PlaceReview[];
  editorial_summary?: string;
  raw_data?: Place;
  created_at?: string;
  updated_at?: string;
}

export interface DbQueryPlace {
  id?: string;
  query_id: string;
  place_id: string;
  rank_position: number;
  created_at?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SearchQueryParams {
  query: string;
  type?: 'text_search' | 'nearby_search';
  latitude?: number;
  longitude?: number;
  radius?: number;
  includedType?: string;
  minRating?: number;
  priceLevels?: string[];
  openNow?: boolean;
  pageSize?: number;
  pageToken?: string;
  regionCode?: string;
}

// Field mask options for API requests
export const BASIC_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'nextPageToken'
];

export const DETAILED_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.location',
  'places.viewport',
  'places.types',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.googleMapsUri',
  'places.businessStatus',
  'places.regularOpeningHours',
  'places.currentOpeningHours',
  'places.photos',
  'places.reviews',
  'places.editorialSummary',
  'nextPageToken'
];

// Place types for filtering (subset from Google's Table A)
export const PLACE_TYPES = [
  'restaurant',
  'cafe',
  'bar',
  'bakery',
  'grocery_store',
  'supermarket',
  'shopping_mall',
  'clothing_store',
  'electronics_store',
  'furniture_store',
  'book_store',
  'pharmacy',
  'hospital',
  'doctor',
  'dentist',
  'gym',
  'spa',
  'beauty_salon',
  'hair_salon',
  'bank',
  'atm',
  'gas_station',
  'car_repair',
  'car_wash',
  'parking',
  'hotel',
  'lodging',
  'tourist_attraction',
  'museum',
  'art_gallery',
  'movie_theater',
  'night_club',
  'park',
  'zoo',
  'aquarium',
  'amusement_park',
  'school',
  'university',
  'library',
  'church',
  'mosque',
  'synagogue',
  'hindu_temple',
  'post_office',
  'police',
  'fire_station',
  'airport',
  'bus_station',
  'train_station',
  'subway_station',
  'taxi_stand',
  'real_estate_agency',
  'lawyer',
  'accounting',
  'insurance_agency',
  'travel_agency'
];

export const PRICE_LEVELS = [
  'PRICE_LEVEL_FREE',
  'PRICE_LEVEL_INEXPENSIVE',
  'PRICE_LEVEL_MODERATE',
  'PRICE_LEVEL_EXPENSIVE',
  'PRICE_LEVEL_VERY_EXPENSIVE'
];
