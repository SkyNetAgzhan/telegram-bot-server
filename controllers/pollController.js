const { Poll, PollOption, PollVote } = require('../models/models');
const ApiError = require('../error/ApiError');

class PollController {
  async createPoll(req, res, next) {
    console.log('createPoll called');
    try {
      const { questionRu, questionKz, options} = req.body;

      if(!questionRu || !questionKz){
        return next(ApiError.badRequest('Необходимо указать тексты вопроса (ru и kz)'));
      }

      if (!options || options.length < 2){
        return next(ApiError.badRequest('Нужно как минимум 2 варианта ответов.'));
      }

      const poll = await Poll.create({ questionRu, questionKz });
      for(const option of options){
        await PollOption.create({ pollId: poll.id, optionTextRu: option.ru, optionTextKz: option.kz});
      }

      return res.json({ message: 'Голосование успешно создано.', pollId: poll.id });
    } catch(err){
      return next(ApiError.internal(err.message));
    }
  }

  async getAllPolls(req, res, next) {
    try{
      const polls = await Poll.findAll({
        include: [{ 
          model: PollOption,
          include: [PollVote]
         }
        ]
      });
      return res.json(polls);
    }catch (err){
      return next(ApiError.internal(err.message));
    }
  }

  async vote(req, res, next){
    try {
      const { pollId, optionId, userId } = req.body;
      const existingVote = await PollVote.findOne({ where: { pollId, userId } });
      if (existingVote){
        return next(ApiError.badRequest('Вы уже проголосовали в этом опросе!'));
      }
      await PollVote.create({ pollId, optionId, userId });
      return res.json({ message:'Голос успешно засчитан' });
    } catch(error){
      return next(ApiError.internal(error.message));
    }
  }

  async getPollById(req, res, next) {
    try {
      const { id } = req.params;
      const poll = await Poll.findByPk(id, {
        include: [{ model: PollOption, as: 'poll_options' }]
      });

      if (!poll || !poll.poll_options) {
        return res.status(404).json({ message: `Опрос #${id} не найден или не содержит вариантов ответов.` });
      }

      return res.json(poll);
    } catch (err) {
      console.error('Ошибка при получении опроса:', err);
      return next(ApiError.internal(err.message));
    }
  }

  async getPollResults(req, res, next){
    try{
      const { id } = req.params;
      const poll = await Poll.findByPk(id, {
        include: [{
          model: PollOption,
          include: [PollVote]
        }]
      });
      if(!poll){
        return next(ApiError.notFound('Опрос не найден!'));
      }

      const results = poll.poll_options.map(option => {
        return {
          id: option.id,
          optionTextRu: option.optionTextRu,
          optionTextKz: option.optionTextKz,
          votes: option.poll_votes.length
        };
      });

      return res.json({
        questionRu: poll.questionRu,
        questionKz: poll.questionKz,
        results
      });
    }catch(err){
      return next(ApiError.internal(err.message));
    }
  }

  async deletePoll(req, res, next) {
    try{
      const { id } = req.params;
      await PollOption.destroy({ where: { pollId: id } });
      await PollVote.destroy({ where: { pollId: id }});
      const deletedPoll = await Poll.destroy({ where: { id } });
      if(!deletedPoll) {
        return next(ApiError.notFound('Голосование не найдено!'));
      }
      return res.json({ message: 'Голосование успешно удалено.' });
    }catch(err){
      return next(ApiError.internal(err.message));
    }
  }
}

module.exports = new PollController();