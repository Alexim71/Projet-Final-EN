const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const morgan = require('morgan');

const app = express();


app.use(morgan('dev'));

router.post('/register', authCtrl.register);
router.get('/confirm/:token', authCtrl.getConfirmationPage);
router.post('/confirm/:token', authCtrl.confirmAccount);
router.post('/login', authCtrl.login);

module.exports = router;