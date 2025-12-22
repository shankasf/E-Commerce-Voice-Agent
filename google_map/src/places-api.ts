import { config } from './config';
import {
  TextSearchRequest,
  NearbySearchRequest,
  PlacesSearchResponse,
  Place,
  DETAILED_FIELD_MASK,
  SearchQueryParams
} from './types';

const PLACES_API_BASE = config.placesApi.baseUrl;

// Make a request to the Google Places API
async function makePlacesRequest<T>(
  endpoint: string,
  body: object,
  fieldMask: string[]
): Promise<T> {
  const url = `${PLACES_API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': config.googleMapsApiKey,
      'X-Goog-FieldMask': fieldMask.join(',')
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Places API error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<T>;
}

// Text Search - search for places using a text query
export async function textSearch(
  params: SearchQueryParams
): Promise<PlacesSearchResponse> {
  const requestBody: TextSearchRequest = {
    textQuery: params.query,
    pageSize: params.pageSize || 20,
    languageCode: 'en',
    regionCode: params.regionCode || 'us'
  };

  // Add included type filter
  if (params.includedType) {
    requestBody.includedType = params.includedType;
  }

  // Add location bias if coordinates provided
  if (params.latitude && params.longitude) {
    requestBody.locationBias = {
      circle: {
        center: {
          latitude: params.latitude,
          longitude: params.longitude
        },
        radius: params.radius || 5000 // Default 5km radius
      }
    };
  }

  // Add min rating filter
  if (params.minRating && params.minRating > 0) {
    requestBody.minRating = params.minRating;
  }

  // Add open now filter
  if (params.openNow) {
    requestBody.openNow = true;
  }

  // Add price levels filter
  if (params.priceLevels && params.priceLevels.length > 0) {
    requestBody.priceLevels = params.priceLevels;
  }

  // Add page token for pagination
  if (params.pageToken) {
    requestBody.pageToken = params.pageToken;
  }

  return makePlacesRequest<PlacesSearchResponse>(
    config.placesApi.textSearch,
    requestBody,
    DETAILED_FIELD_MASK
  );
}

// Nearby Search - search for places near a location
export async function nearbySearch(
  latitude: number,
  longitude: number,
  radius: number = 5000,
  includedTypes?: string[],
  maxResultCount: number = 20
): Promise<PlacesSearchResponse> {
  const requestBody: NearbySearchRequest = {
    locationRestriction: {
      circle: {
        center: { latitude, longitude },
        radius
      }
    },
    maxResultCount,
    rankPreference: 'POPULARITY'
  };

  if (includedTypes && includedTypes.length > 0) {
    requestBody.includedTypes = includedTypes;
  }

  return makePlacesRequest<PlacesSearchResponse>(
    config.placesApi.nearbySearch,
    requestBody,
    DETAILED_FIELD_MASK
  );
}

// Get place details by place ID
export async function getPlaceDetails(placeId: string): Promise<Place> {
  const url = `${PLACES_API_BASE}${config.placesApi.placeDetails}/${placeId}`;
  
  const fieldMask = DETAILED_FIELD_MASK
    .filter(f => f.startsWith('places.'))
    .map(f => f.replace('places.', ''));

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': config.googleMapsApiKey,
      'X-Goog-FieldMask': fieldMask.join(',')
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Places API error: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<Place>;
}

// Get photo URL for a place photo
export function getPhotoUrl(photoName: string, maxWidth: number = 400): string {
  return `${PLACES_API_BASE}/${photoName}/media?maxWidthPx=${maxWidth}&key=${config.googleMapsApiKey}`;
}

// Format place for display
export function formatPlaceForDisplay(place: Place): object {
  return {
    id: place.id,
    name: place.displayName?.text || 'Unknown',
    address: place.formattedAddress || 'No address',
    shortAddress: place.shortFormattedAddress,
    location: place.location,
    types: place.types || [],
    primaryType: place.primaryType,
    rating: place.rating,
    totalRatings: place.userRatingCount,
    priceLevel: place.priceLevel,
    website: place.websiteUri,
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber,
    googleMapsUrl: place.googleMapsUri,
    businessStatus: place.businessStatus,
    isOpenNow: place.currentOpeningHours?.openNow ?? place.regularOpeningHours?.openNow,
    openingHours: place.regularOpeningHours?.weekdayDescriptions,
    photos: place.photos?.map(photo => ({
      url: getPhotoUrl(photo.name),
      width: photo.widthPx,
      height: photo.heightPx
    })),
    summary: place.editorialSummary?.text,
    reviews: place.reviews?.slice(0, 3).map(review => ({
      author: review.authorAttribution?.displayName,
      rating: review.rating,
      text: review.text?.text,
      time: review.relativePublishTimeDescription
    }))
  };
}
