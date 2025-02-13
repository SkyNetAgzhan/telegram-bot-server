const Router = require('express');
const router = new Router();
const pollController = require('../controllers/pollController');
const checkRole = require('../middleware/checkRoleMiddleware.js');

router.post('/create',checkRole('ADMIN'), pollController.createPoll);
router.get('/', pollController.getAllPolls);
router.post('/vote', pollController.vote);
router.get('/:id/results', pollController.getPollResults);
router.delete('/:id', checkRole('ADMIN'), pollController.deletePoll);
router.get('/:id', pollController.getPollById);

module.exports = router;