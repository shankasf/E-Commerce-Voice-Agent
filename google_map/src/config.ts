import dotenv from 'dotenv';

dotenv.config();

export const config = {
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Google Places API endpoints
  placesApi: {
    baseUrl: 'https://places.googleapis.com/v1',
    textSearch: '/places:searchText',
    nearbySearch: '/places:searchNearby',
    placeDetails: '/places',
  }
};

export function validateConfig(): void {
  const requiredEnvVars = [
    'GOOGLE_MAPS_API_KEY',
    'OPENAI_API_KEY',
  ];

  const missing = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missing.length > 0) {
    console.warn(
      `Warning: Missing environment variables: ${missing.join(', ')}`
    );
    console.warn('Some features may not work correctly.');
  }
}
