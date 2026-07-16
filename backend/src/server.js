const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { attachSockets } = require('./sockets');

const server = http.createServer(app);
attachSockets(server);

server.listen(env.port, () => {
  console.log(`SmartTrack API listening on http://localhost:${env.port}`);
});
