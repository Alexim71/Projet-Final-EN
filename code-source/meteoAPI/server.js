require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const authRoutes = require('./routes/auth');
const swaggerDocs = require("./swagger");
const geoRoutes = require('./routes/geo.routes');
const rainRoutes = require('./routes/rain.routes');
const iotRoutes = require('./routes/iot');

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) {
  const trustProxyHops = Number(process.env.TRUST_PROXY);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 1) {
    throw new Error('TRUST_PROXY doit être un nombre entier positif.');
  }
  app.set('trust proxy', trustProxyHops);
}
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"]
    }
  }
}));
app.use(express.json({ limit: '100kb' }));
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8081,http://localhost:19006')
 .split(',')
 .map(origin => origin.trim())
 .filter(Boolean);
app.use(cors({
 origin(origin, callback) {
   if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
   return callback(null, false);
 }
}));
app.use('/api/auth', authRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/rain', rainRoutes);
app.use('/api/iot', iotRoutes);

app.get("/", (req, res) => {
   res.send("API fonctionne ✅");
});

const deviceRoutes = require('./routes/device');
app.use('/api/device', deviceRoutes);

const dataRoutes = require('./routes/data');
app.use('/api/data', dataRoutes);

const stationRoutes = require('./routes/stations');
app.use('/api/stations', stationRoutes);

const weatherDashboardRoutes = require('./routes/weatherDashboard');
app.use('/api/weatherDashboard', weatherDashboardRoutes);

const alertRoutes = require('./routes/alerts');
app.use('/api/alerts', alertRoutes);

const weatherRoutes = require('./routes/weather');
app.use('/api/weather', weatherRoutes);

const forecastRoutes = require('./routes/forecast');
app.use('/api/weather/forecast', forecastRoutes);

const historyRoutes = require('./routes/history');
app.use('/api/weather/history', historyRoutes);


app.get('/health', (req, res) => {
  res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({
    status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable'
  });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'La requête dépasse la taille autorisée.' });
  }
  if (err instanceof SyntaxError && Object.prototype.hasOwnProperty.call(err, 'body')) {
    return res.status(400).json({ message: 'Le JSON envoyé est invalide.' });
  }
  console.error('[request]', err);
  return res.status(500).json({ message: 'Erreur interne du serveur.' });
});

async function start() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGO_URI (ou MONGODB_URI) est requis.');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET est requis et doit contenir au moins 32 caractères.');
  }

  await mongoose.connect(mongoUri);
  console.log('Connecté à MongoDB');
  require("./cron/cleanup");
  require("./cron/syncWeather");
  swaggerDocs(app);

  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Serveur démarré sur le port ${port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

if (require.main === module) {
  start().catch(err => {
    console.error('Impossible de démarrer le serveur:', err);
    process.exit(1);
  });
}

module.exports = { app, start };
