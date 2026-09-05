const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { attachSockets } = require('./sockets');
const { startTripAutoCloseJob } = require('./jobs/tripAutoClose');

const server = http.createServer(app);
const io = attachSockets(server);
app.set('io', io);
server.listen(env.port, () => {
  console.log(`SmartTrack API listening on http://localhost:${env.port}`);
  startTripAutoCloseJob(io);
});
