const cron = require("node-cron");
const Data = require("../models/Data");

// Tâche planifiée : tous les jours à 00:10
cron.schedule("10 0 * * *", async () => {
  console.log("🧹 Nettoyage automatique des données météo (>30 jours)…");

  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() - 30);

  try {
    const result = await Data.deleteMany({
      timestamp: { $lt: limitDate }
    });

    console.log(`✔️ ${result.deletedCount} enregistrements supprimés`);
  } catch (err) {
    console.error("❌ Erreur lors du nettoyage :", err);
  }
});

console.log("⏱️ Cron de nettoyage chargé.");
