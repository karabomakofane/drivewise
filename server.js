/* =============================================
   server.js
   Express static server + WebSocket server
   for the phone controller feature.
   ============================================= */

const express   = require('express');
const http      = require('http');
const WebSocket = require('ws');
const QRCode    = require('qrcode');
const path      = require('path');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

/* Serve static DriveWise files */
app.use(express.static(path.join(__dirname)));

/* Track connected clients */
let gameClient       = null;  /* the browser tab running the game */
let controllerClient = null;  /* the phone                        */

wss.on('connection', (ws, req) => {
  const url = req.url;
  console.log('New connection:', url);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);

      /* ---- IDENTIFY CLIENT ---- */
      if (msg.type === 'identify') {
        if (msg.role === 'game') {
          gameClient = ws;
          console.log('Game client connected');
          ws.send(JSON.stringify({ type: 'identified', role: 'game' }));
        }
        if (msg.role === 'controller') {
          controllerClient = ws;
          console.log('Controller (phone) connected');
          ws.send(JSON.stringify({ type: 'identified', role: 'controller' }));
          /* Tell game that controller is connected */
          if (gameClient && gameClient.readyState === WebSocket.OPEN) {
            gameClient.send(JSON.stringify({ type: 'controller_connected' }));
          }
        }
        return;
      }

      /* ---- PHONE → GAME: tilt and brake ---- */
      if (msg.type === 'tilt' || msg.type === 'brake') {
        if (gameClient && gameClient.readyState === WebSocket.OPEN) {
          gameClient.send(JSON.stringify(msg));
        }
        return;
      }

      /* ---- GAME → PHONE: vibrate on crash ---- */
      if (msg.type === 'crash' || msg.type === 'wrong') {
        if (controllerClient && controllerClient.readyState === WebSocket.OPEN) {
          controllerClient.send(JSON.stringify(msg));
        }
        return;
      }

    } catch (e) {
      console.error('Bad message:', e.message);
    }
  });

  ws.on('close', () => {
    if (ws === gameClient) {
      gameClient = null;
      console.log('Game client disconnected');
    }
    if (ws === controllerClient) {
      controllerClient = null;
      console.log('Controller disconnected');
      /* Notify game */
      if (gameClient && gameClient.readyState === WebSocket.OPEN) {
        gameClient.send(JSON.stringify({ type: 'controller_disconnected' }));
      }
    }
  });
});

/* QR Code endpoint — returns a PNG of the controller URL */
app.get('/qr', async (req, res) => {
  const host = req.headers.host;
  const controllerURL = `https://${host}/controller.html`;
  console.log('QR code requested for:', controllerURL);
  try {
    const qrDataURL = await QRCode.toDataURL(controllerURL, {
      width:  300,
      margin: 2,
      color:  { dark: '#000000', light: '#ffffff' },
    });
    /* Return as JSON so game.js can embed it */
    res.json({ qr: qrDataURL, url: controllerURL });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`DriveWise server running on port ${PORT}`);
  console.log(`Game:       http://localhost:${PORT}`);
  console.log(`Controller: http://localhost:${PORT}/controller.html`);
  console.log(`QR Code:    http://localhost:${PORT}/qr`);
});