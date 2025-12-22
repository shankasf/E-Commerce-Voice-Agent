import express, { Router, Request, Response } from 'express';
import { 
  textSearch, 
  nearbySearch, 
  getPlaceDetails, 
  formatPlaceForDisplay 
} from './places-api';
import {
  saveSearchQuery,
  savePlacesFromSearch,
  getSearchQueries,
  getPlacesForQuery,
  getAllPlaces,
  searchPlacesInDb,
  getSupabaseClient
} from './database';
import { 
  ApiResponse, 
  SearchQueryParams, 
  DbSearchQuery,
  PLACE_TYPES,
  PRICE_LEVELS
} from './types';

const router: Router = express.Router();

// Search places using text query
router.post('/search', async (req: Request, res: Response) => {
  try {
    const params: SearchQueryParams = {
      query: req.body.query,
      type: req.body.type || 'text_search',
      latitude: req.body.latitude ? parseFloat(req.body.latitude) : undefined,
      longitude: req.body.longitude ? parseFloat(req.body.longitude) : undefined,
      radius: req.body.radius ? parseInt(req.body.radius, 10) : undefined,
      includedType: req.body.includedType,
      minRating: req.body.minRating ? parseFloat(req.body.minRating) : undefined,
      priceLevels: req.body.priceLevels,
      openNow: req.body.openNow === true || req.body.openNow === 'true',
      pageSize: req.body.pageSize ? parseInt(req.body.pageSize, 10) : 20,
      pageToken: req.body.pageToken,
      regionCode: req.body.regionCode || 'us'
    };

    if (!params.query) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Query parameter is required'
      };
      return res.status(400).json(response);
    }

    // Perform the search
    const searchResult = await textSearch(params);

    // Format places for display
    const formattedPlaces = searchResult.places?.map(formatPlaceForDisplay) || [];

    // Save to database if Supabase is configured
    if (getSupabaseClient() && searchResult.places?.length) {
      const dbQuery: DbSearchQuery = {
        query_text: params.query,
        query_type: 'text_search',
        location_lat: params.latitude,
        location_lng: params.longitude,
        radius: params.radius,
        included_type: params.includedType,
        min_rating: params.minRating,
        price_levels: params.priceLevels,
        open_now: params.openNow,
        page_size: params.pageSize,
        region_code: params.regionCode
      };

      const savedQuery = await saveSearchQuery(dbQuery);
      if (savedQuery?.id) {
        await savePlacesFromSearch(savedQuery.id, searchResult.places);
      }
    }

    const response: ApiResponse<object> = {
      success: true,
      data: {
        places: formattedPlaces,
        count: formattedPlaces.length,
        nextPageToken: searchResult.nextPageToken
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Search error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    res.status(500).json(response);
  }
});

// Nearby search
router.post('/nearby', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius, includedTypes, maxResultCount } = req.body;

    if (!latitude || !longitude) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Latitude and longitude are required'
      };
      return res.status(400).json(response);
    }

    const searchResult = await nearbySearch(
      parseFloat(latitude),
      parseFloat(longitude),
      radius ? parseInt(radius, 10) : 5000,
      includedTypes,
      maxResultCount ? parseInt(maxResultCount, 10) : 20
    );

    const formattedPlaces = searchResult.places?.map(formatPlaceForDisplay) || [];

    // Save to database
    if (getSupabaseClient() && searchResult.places?.length) {
      const dbQuery: DbSearchQuery = {
        query_text: `Nearby: ${latitude}, ${longitude}`,
        query_type: 'nearby_search',
        location_lat: parseFloat(latitude),
        location_lng: parseFloat(longitude),
        radius: radius ? parseInt(radius, 10) : 5000,
        included_type: includedTypes?.join(',')
      };

      const savedQuery = await saveSearchQuery(dbQuery);
      if (savedQuery?.id) {
        await savePlacesFromSearch(savedQuery.id, searchResult.places);
      }
    }

    const response: ApiResponse<object> = {
      success: true,
      data: {
        places: formattedPlaces,
        count: formattedPlaces.length
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Nearby search error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    res.status(500).json(response);
  }
});

// Get place details
router.get('/place/:placeId', async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Place ID is required'
      };
      return res.status(400).json(response);
    }

    const place = await getPlaceDetails(placeId);
    const formattedPlace = formatPlaceForDisplay(place);

    const response: ApiResponse<object> = {
      success: true,
      data: formattedPlace
    };

    res.json(response);
  } catch (error) {
    console.error('Get place details error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    res.status(500).json(response);
  }
});

// Get search history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const result = await getSearchQueries(page, limit);

    if (!result) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Database not configured or error fetching history'
      };
      return res.status(500).json(response);
    }

    const response: ApiResponse<object> = {
      success: true,
      data: {
        queries: result.queries,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get history error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    res.status(500).json(response);
  }
});

// Get places for a specific query
router.get('/history/:queryId/places', async (req: Request, res: Response) => {
  try {
    const { queryId } = req.params;

    const places = await getPlacesForQuery(queryId);

    if (!places) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Database not configured or error fetching places'
      };
      return res.status(500).json(response);
    }

    const response: ApiResponse<object> = {
      success: true,
      data: {
        places,
        count: places.length
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get query places error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    res.status(500).json(response);
  }
});

// Get all saved places
router.get('/places', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;

    const result = await getAllPlaces(page, limit);

    if (!result) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Database not configured or error fetching places'
      };
      return res.status(500).json(response);
    }

    const response: ApiResponse<object> = {
      success: true,
      data: {
        places: result.places,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get all places error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    res.status(500).json(response);
  }
});

// Search saved places in database
router.get('/places/search', async (req: Request, res: Response) => {
  try {
    const term = req.query.term as string;

    if (!term) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Search term is required'
      };
      return res.status(400).json(response);
    }

    const places = await searchPlacesInDb(term);

    if (!places) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Database not configured or error searching places'
      };
      return res.status(500).json(response);
    }

    const response: ApiResponse<object> = {
      success: true,
      data: {
        places,
        count: places.length
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Search places in DB error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    res.status(500).json(response);
  }
});

// Get available place types
router.get('/types', (_req: Request, res: Response) => {
  const response: ApiResponse<object> = {
    success: true,
    data: {
      placeTypes: PLACE_TYPES,
      priceLevels: PRICE_LEVELS
    }
  };
  res.json(response);
});

// ═══════════════════════════════════════════════════════════════
// AI AGENT CHATBOT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

import { chat, chatStream, getChatHistory, clearSession, ChatMessage } from './agent';
import { exportAsText, exportAsPDF, exportAsDocx } from './export';
import { v4 as uuidv4 } from 'uuid';

// Create new chat session
router.post('/chat/session', (_req: Request, res: Response) => {
  const sessionId = uuidv4();
  const response: ApiResponse<object> = {
    success: true,
    data: { sessionId }
  };
  res.json(response);
});

// Send message to chat agent
router.post('/chat/message', async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Session ID and message are required'
      };
      return res.status(400).json(response);
    }

    const wantsStream = req.query?.stream === '1' || `${req.headers.accept || ''}`.includes('text/event-stream');

    if (wantsStream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      // Disable nginx proxy buffering if present.
      res.setHeader('X-Accel-Buffering', 'no');
      (res as any).flushHeaders?.();

      const abortController = new AbortController();
      // Important: `req.on('close')` may fire once the request body is fully consumed,
      // even when the client is still connected. Use `aborted`/`res.close` instead.
      req.on('aborted', () => abortController.abort());
      res.on('close', () => abortController.abort());

      // Keep-alive ping for some proxies.
      const keepAlive = setInterval(() => {
        try {
          res.write(`event: ping\ndata: {}\n\n`);
        } catch {
          // ignore
        }
      }, 15000);

      const sendEvent = (event: string, data: unknown) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      sendEvent('start', { sessionId });

      // NOTE: In some environments/models, SDK streaming may not emit `output_text_delta` events.
      // To guarantee “buffering mode” UX, we simulate streaming by chunking the final response.
      const assistantMessage = await chat(sessionId, message);

      const text = assistantMessage.content || '';
      const chunkSize = 16;
      for (let i = 0; i < text.length; i += chunkSize) {
        if (abortController.signal.aborted) break;
        const delta = text.slice(i, i + chunkSize);
        sendEvent('delta', { delta });
        // Small delay to mimic typing; keep it snappy.
        await new Promise((r) => setTimeout(r, 10));
      }

      sendEvent('done', { success: true, data: { message: assistantMessage, sessionId } });
      clearInterval(keepAlive);
      res.end();
      return;
    }

    const assistantMessage = await chat(sessionId, message);

    const response: ApiResponse<object> = {
      success: true,
      data: {
        message: assistantMessage,
        sessionId,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Chat error occurred'
    };
    res.status(500).json(response);
  }
});

// Get chat history
router.get('/chat/history/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const history = getChatHistory(sessionId);

    const response: ApiResponse<object> = {
      success: true,
      data: {
        history,
        count: history.length
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get history error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Error fetching history'
    };
    res.status(500).json(response);
  }
});

// Clear chat session
router.delete('/chat/session/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    clearSession(sessionId);

    const response: ApiResponse<object> = {
      success: true,
      data: { message: 'Session cleared' }
    };

    res.json(response);
  } catch (error) {
    console.error('Clear session error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Error clearing session'
    };
    res.status(500).json(response);
  }
});

// Export chat as TXT
router.get('/chat/export/:sessionId/txt', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const history = getChatHistory(sessionId);

    if (history.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No chat history found for this session'
      });
    }

    const text = exportAsText(history);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="chat-export-${sessionId}.txt"`);
    res.send(text);
  } catch (error) {
    console.error('Export TXT error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Export error'
    });
  }
});

// Export chat as PDF
router.get('/chat/export/:sessionId/pdf', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const history = getChatHistory(sessionId);

    if (history.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No chat history found for this session'
      });
    }

    const pdfBuffer = await exportAsPDF(history);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="chat-export-${sessionId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Export error'
    });
  }
});

// Export chat as DOCX
router.get('/chat/export/:sessionId/docx', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const history = getChatHistory(sessionId);

    if (history.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No chat history found for this session'
      });
    }

    const docxBuffer = await exportAsDocx(history);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="chat-export-${sessionId}.docx"`);
    res.send(docxBuffer);
  } catch (error) {
    console.error('Export DOCX error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Export error'
    });
  }
});

export default router;
