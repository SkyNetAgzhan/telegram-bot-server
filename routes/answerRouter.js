const Router = require('express');
const router = new Router();
const answerController = require('../controllers/answerController.js');
const checkRole = require('../middleware/checkRoleMiddleware.js');

router.post('/create', checkRole('ADMIN'), answerController.create);
router.get('/', answerController.getAll);
router.get('/:id', answerController.getOne);
router.delete('/:id', checkRole('ADMIN'), answerController.delete);
router.put('/swapCategoriesAndSubs', answerController.swapCategoriesAndSubs);
router.put('/swapSubs', answerController.swapSubs);

module.exports = router;
