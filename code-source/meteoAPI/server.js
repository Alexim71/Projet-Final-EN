const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require('./routes/auth');
const geoRoutes = require('./routes/geo.routes');



const app = express();
app.use(express.json()); // Pour lire du JSON
app.use(cors());
app.use('/api/auth', authRoutes);
app.use('/api/geo', geoRoutes);


// 1️⃣ Connexion à MongoDB
mongoose.connect("mongodb://localhost:27017/meteo_db", {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ Connecté à MongoDB"))
.catch(err => console.error("❌ Erreur MongoDB :", err));


// ➡️ Route test
app.get("/", (req, res) => {
    res.send("API fonctionne ✅");
});

// 4️⃣ Lancer le serveur
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
