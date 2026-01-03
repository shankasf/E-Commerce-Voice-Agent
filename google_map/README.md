# Google Maps Places Scraper

> **Last Updated:** December 28, 2025

A TypeScript-based application that uses Google Maps Places API to search and scrape place data, storing results in Supabase.

## Features

- 🔍 **Text Search**: Search for places using natural language queries (e.g., "Italian restaurants in New York")
- 📍 **Nearby Search**: Find places near a specific location
- 🎯 **Advanced Filters**: Filter by place type, rating, price level, and open status
- 💾 **Data Persistence**: All search results are automatically saved to Supabase
- 📊 **Search History**: View and revisit past searches
- 📥 **Export**: Download results as JSON
- 🖥️ **Web UI**: User-friendly interface for submitting queries and viewing results

## Prerequisites

- Node.js 18+
- Google Cloud account with Places API enabled
- Supabase account and project

## Setup

### 1. Clone and Install Dependencies

```bash
cd google_map
npm install
```

### 2. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Places API (New)** from the API Library
4. Go to **Credentials** and create an API key
5. Optionally restrict the key to Places API

### 3. Set Up Supabase

1. Create a new project at [Supabase](https://app.supabase.com/)
2. Go to **SQL Editor** and run the schema from `db/schema.sql`
3. Go to **Project Settings** → **API** to get your URL and **service_role** key (not anon key)

### 4. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
PORT=3000
NODE_ENV=development
```

> **Note:** We use the `service_role` key which bypasses Row Level Security (RLS). This is appropriate for server-side applications where the key is kept secret. Never expose this key in client-side code.

### 5. Run the Application

**Development mode (with hot reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The server will start at `http://localhost:3000`

## Usage

### Web Interface

1. Open `http://localhost:3000` in your browser
2. Enter a search query (e.g., "Coffee shops in San Francisco")
3. Optionally expand "Advanced Options" to set filters:
   - Place type (restaurant, cafe, hotel, etc.)
   - Minimum rating
   - Open now filter
   - Location bias with coordinates and radius
4. Click "Search Places" to see results
5. Click on any place card to see full details
6. Export results as JSON using the "Export JSON" button

### API Endpoints

#### Search Places
```bash
POST /api/search
Content-Type: application/json

{
  "query": "Italian restaurants in New York",
  "includedType": "restaurant",
  "minRating": 4,
  "openNow": true,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "radius": 5000,
  "pageSize": 20
}
```

#### Nearby Search
```bash
POST /api/nearby
Content-Type: application/json

{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "radius": 5000,
  "includedTypes": ["restaurant", "cafe"],
  "maxResultCount": 20
}
```

#### Get Place Details
```bash
GET /api/place/{placeId}
```

#### Get Search History
```bash
GET /api/history?page=1&limit=20
```

#### Get Places for a Query
```bash
GET /api/history/{queryId}/places
```

#### Get All Saved Places
```bash
GET /api/places?page=1&limit=50
```

#### Search Saved Places
```bash
GET /api/places/search?term=coffee
```

#### Get Available Place Types
```bash
GET /api/types
```

## Available Place Types

The API supports filtering by these place types:
- `restaurant`, `cafe`, `bar`, `bakery`
- `grocery_store`, `supermarket`
- `shopping_mall`, `clothing_store`, `electronics_store`
- `hotel`, `lodging`
- `hospital`, `pharmacy`, `doctor`, `dentist`
- `gym`, `spa`, `beauty_salon`
- `bank`, `atm`
- `gas_station`, `car_repair`, `parking`
- `tourist_attraction`, `museum`, `park`
- `school`, `university`, `library`
- And many more...

## Database Schema

The application uses three tables:

1. **search_queries**: Stores search parameters and metadata
2. **places**: Stores scraped place data (deduplicated by Google Place ID)
3. **query_places**: Links queries to places with ranking

## Project Structure

```
google_map/
├── .env                    # Environment variables
├── .env.example            # Example environment file
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── db/
│   └── schema.sql          # Supabase database schema
├── public/
│   └── index.html          # Web UI
└── src/
    ├── config.ts           # Configuration loader
    ├── types.ts            # TypeScript type definitions
    ├── database.ts         # Supabase database operations
    ├── places-api.ts       # Google Places API client
    ├── routes.ts           # Express API routes
    └── server.ts           # Express server entry point
```

## Cost Considerations

Google Places API uses a pay-as-you-go pricing model:
- **Text Search (Pro)**: ~$32 per 1000 requests
- **Nearby Search**: ~$32 per 1000 requests
- **Place Details**: ~$17-25 per 1000 requests

Use field masks wisely to reduce costs. The app uses detailed field masks by default for comprehensive data.

## License

MIT
