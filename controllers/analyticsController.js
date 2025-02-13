const { BotVisitor } = require('../models/models');
const { Op } = require('sequelize');

class AnalyticsController {
  async getBotStats(req, res, next) {
    try {
      const total = await BotVisitor.count({
        distinct: true,
        col: 'userId'
      });
      const startOfToday = new Date();
      startOfToday.setHours(0,0,0,0);

      const today = await BotVisitor.count({
        distinct: true,
        col: 'userId',
        where: {
          visitedAt: { [Op.gte]: startOfToday }
        }
      });

      return res.json({
        totalUniqueUsers: total,
        todayUniqueUsers: today
      });
    } catch (err){
      console.error('getBotStats error: ', err);
      return res.status(500).json({ message: 'Ошибка сервера при получении статистики' });
    }
  }

  async recordVisit(req, res, next) {
    try {
      const { userId } = req.body;
      if(!userId){
        return res.status(400).json({ message: 'No userId provided' });
      }
      await BotVisitor.create({ userId });
      return res.json({ message: 'Visit recorded' });
    } catch (err){
      console.error('recordedVisit error: ', err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
}

module.exports = new AnalyticsController();