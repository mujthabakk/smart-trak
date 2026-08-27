const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const apiRoutes = require('./routes.index');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: false, // allow serving images across origins
}));
app.use(cors({ origin: env.corsOrigins.length ? env.corsOrigins : '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.static('public')); // Serve uploads
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

const tenantMiddleware = require('./middleware/tenant');

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', tenantMiddleware, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
