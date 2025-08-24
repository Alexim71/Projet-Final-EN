const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');



router.post('/register', authCtrl.register);
router.get('/confirm/:token', authCtrl.getConfirmationPage);
router.post('/confirm/:token', authCtrl.confirmAccount);
router.post('/login', authCtrl.login);

module.exports = router;