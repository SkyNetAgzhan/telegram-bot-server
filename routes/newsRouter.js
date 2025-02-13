const Router = require('express');
const router = new Router();
const NewsController = require('../controllers/newsController');
const checkRole = require('../middleware/checkRoleMiddleware.js');
const newsController = require('../controllers/newsController');
const authMiddleware = require('../middleware/authMiddleware.js');

router.post('/create', NewsController.create);
router.get('/', newsController.getAll);
router.get('/:id', newsController.getOne);
router.put('/update/:id', checkRole('ADMIN'), newsController.update);
router.delete('/:id', checkRole('ADMIN'), newsController.delete);

module.exports = router;