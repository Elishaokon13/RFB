const express = require('express');
const WebSocket = require('ws');
const app = express();
const port = 4000;

// Simple HTTP endpoint for health check
app.get('/', (req, res) => res.send('Log server running!'));

// WebSocket server for log streaming
const server = app.listen(port, () => {
  console.log(`Log server listening at http://localhost:${port}`);
});
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  ws.on('message', msg => {
    // Print log messages to terminal
    console.log(`[LOG] ${msg}`);
  });
  ws.send('Connected to log server!');
}); 