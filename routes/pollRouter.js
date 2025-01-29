const Router = require('express');
const router = new Router();
const pollController = require('../controllers/pollController');

router.post('/create', pollController.createPoll);
router.get('/', pollController.getAllPolls);
router.post('/vote', pollController.vote);
router.get('/:id/results', pollController.getPollResults);
router.delete('/:id', pollController.deletePoll);

module.exports = router;