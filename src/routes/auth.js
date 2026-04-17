const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const authController = require('../controllers/authController');

router.get('/register', authController.getRegister);
router.post('/register', upload.single('avatar'), authController.registerUser);

router.get('/login', authController.getLogin);
router.post('/login', authController.loginUser);

router.post('/logout', authController.logoutUser);

router.get('/profile', authController.getProfile);
router.post('/profile', upload.single('avatar'), authController.updateProfile);

module.exports = router;
