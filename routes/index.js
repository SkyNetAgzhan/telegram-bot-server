const Router = require('express');
const router = new Router();
const answerRouter = require('./answerRouter.js');
const userRouter = require('./userRouter.js');
const pollRouter = require('./pollRouter.js');
const analyticsRouter = require('./analyticsRouter.js');
const newsRouter = require('./newsRouter.js');

router.use('/user', userRouter);
router.use('/answer', answerRouter);
router.use('/poll', pollRouter);
router.use('/analytics', analyticsRouter);
router.use('/news', newsRouter);

module.exports = router;