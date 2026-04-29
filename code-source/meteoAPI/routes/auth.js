const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');

router.post('/register', authCtrl.register);
router.post('/confirm-code', authCtrl.confirmCode);
router.get('/confirm/:token', authCtrl.getConfirmationPage);
router.post('/confirm/:token', authCtrl.confirmAccount);
router.post('/login', authCtrl.login);

// Route GET test pour vérifier le router /api/auth
/**
 * @swagger
 * /api/auth:
 *   get:
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Connexion
 *       500:
 *         description: Erreur serveur
 */
router.get('/', (req, res) => {
    res.send("Route /api/auth fonctionne ✅");
});

module.exports = router;


