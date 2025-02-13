const Router = require('express');
const router = new Router();
const analyticsController = require('../controllers/analyticsController.js');

router.get('/bot', analyticsController.getBotStats);
router.post('/visit', analyticsController.recordVisit);

module.exports = router;
