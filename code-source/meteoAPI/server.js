require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require('./routes/auth');
const swaggerDocs = require("./swagger");


// Charger les crons
require("./cron/cleanup");
require("./cron/syncWeather");
const geoRoutes = require('./routes/geo.routes');
const rainRoutes = require('./routes/rain.routes');



const app = express();
app.use(express.json()); // Pour lire du JSON
app.use(cors());
app.use('/api/auth', authRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/rain', rainRoutes);



//  Connexion à MongoDB
//mongoose.connect("mongodb://localhost:27017/meteoDB", {
mongoose.connect("mongodb://localhost:27017/meteo_db2", {

    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ Connecté à MongoDB"))
.catch(err => console.error("❌ Erreur MongoDB :", err));


//  Route test
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


//  Lancer le serveur
const os = require("os");

const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (let iface of Object.values(interfaces)) {
    for (let i of iface) {
      if (i.family === "IPv4" && !i.internal) {
        return i.address;
      }
    }
  }
  return "localhost";
};

const PORT = 3000;

app.listen(PORT, "0.0.0.0", () => {
  const ip = getLocalIP();
  console.log(`🚀 Serveur démarré sur http://${ip}:${PORT}`);
  swaggerDocs(app);
});
