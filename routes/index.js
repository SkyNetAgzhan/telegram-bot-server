const Router = require('express');
const router = new Router();
const answerRouter = require('./answerRouter.js');
const userRouter = require('./userRouter.js');

router.use('/user', userRouter);
router.use('/answer', answerRouter);

module.exports = router;
