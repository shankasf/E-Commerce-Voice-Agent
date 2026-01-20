const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('ws');
const { createClient } = require('@supabase/supabase-js');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3001', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Supabase client for database operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } }
    })
  : null;

// Store active device connections
const deviceSessions = new Map(); // sessionId -> { ws, lastHeartbeat, heartbeatInterval }

// Heartbeat timeout (60 seconds)
const HEARTBEAT_TIMEOUT = 60000;

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create primitive WebSocket server for device connections (Windows app)
  const deviceWss = new Server({ 
    server,
    path: '/api/device/ws'
  });

  // Primitive device WebSocket server - just heartbeat monitoring
  deviceWss.on('connection', async (ws, req) => {
    const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
    const sessionId = urlParams.get('session');
    
    if (!sessionId) {
      console.error('[Device WS] Missing session_id');
      ws.close(1008, 'Missing session_id');
      return;
    }

    console.log(`[Device WS] New connection: ${sessionId}`);

    // Look up connection in database
    if (supabase) {
      const { data, error } = await supabase
        .from('device_connections')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error || !data) {
        console.error(`[Device WS] Connection not found in database: ${sessionId}`);
        ws.close(1008, 'Connection not found');
        return;
      }

      // Set is_active = true
      await supabase
        .from('device_connections')
        .update({
          is_active: true,
          connected_at: new Date().toISOString(),
          last_heartbeat: new Date().toISOString(),
        })
        .eq('session_id', sessionId);
      console.log(`[Device WS] Set is_active = true for session: ${sessionId}`);
    }

    // Track heartbeat
    let lastHeartbeat = Date.now();
    let heartbeatInterval = null;

    // Start heartbeat monitoring
    heartbeatInterval = setInterval(async () => {
      const now = Date.now();
      const timeSinceHeartbeat = now - lastHeartbeat;

      // If no heartbeat for HEARTBEAT_TIMEOUT, disconnect
      if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT) {
        console.log(`[Device WS] Heartbeat timeout for session: ${sessionId} - disconnecting`);
        clearInterval(heartbeatInterval);
        
        // Set isActive to false in database
        if (supabase) {
          await supabase
            .from('device_connections')
            .update({
              is_active: false,
              disconnected_at: new Date().toISOString(),
            })
            .eq('session_id', sessionId);
        }
        
        ws.close(1008, 'Heartbeat timeout');
        deviceSessions.delete(sessionId);
      }
    }, 15000); // Check every 15 seconds

    // Store session
    const deviceSession = {
      ws,
      sessionId,
      lastHeartbeat,
      heartbeatInterval,
    };
    deviceSessions.set(sessionId, deviceSession);

    // Handle messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Update heartbeat on any message
        lastHeartbeat = Date.now();
        deviceSession.lastHeartbeat = lastHeartbeat;

        // Handle heartbeat message
        if (message.type === 'heartbeat') {
          if (supabase) {
            await supabase
              .from('device_connections')
              .update({
                last_heartbeat: new Date().toISOString(),
              })
              .eq('session_id', sessionId);
          }
          ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
        }

        // Handle handshake
        if (message.type === 'handshake') {
          ws.send(JSON.stringify({
            type: 'handshake_ack',
            session_id: sessionId,
            timestamp: new Date().toISOString(),
          }));
        }
      } catch (error) {
        console.error(`[Device WS] ${sessionId} error:`, error);
      }
    });

    ws.on('close', async () => {
      console.log(`[Device WS] ${sessionId} disconnected`);
      
      // Clear heartbeat interval
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      // Set isActive to false in database
      if (supabase) {
        await supabase
          .from('device_connections')
          .update({
            is_active: false,
            disconnected_at: new Date().toISOString(),
          })
          .eq('session_id', sessionId);
        console.log(`[Device WS] Set is_active = false for session: ${sessionId}`);
      }

      deviceSessions.delete(sessionId);
    });

    ws.on('error', (error) => {
      console.error(`[Device WS] ${sessionId} WebSocket error:`, error);
    });
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Device WebSocket server ready on ws://${hostname}:${port}/api/device/ws`);
  });
});
