const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require('./routes/auth');



const app = express();
app.use(express.json()); // Pour lire du JSON
app.use(cors());
app.use('/api/auth', authRoutes);


//  Connexion à MongoDB
mongoose.connect("mongodb://localhost:27017/meteoDB", {
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
app.use('/api/weather', weatherDashboardRoutes);

const alertRoutes = require('./routes/alerts');
app.use('/api/alerts', alertRoutes);

//  Lancer le serveur
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
