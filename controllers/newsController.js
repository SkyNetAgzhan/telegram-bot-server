const { News } = require('../models/models');
const ApiError = require('../error/ApiError');
const path = require('path');
const fs = require('fs');
const iconv = require('iconv-lite');

class NewsController {
  async create(req, res, next){
    try {
      const { topic, date, text } = req.body;
      let fileData = req.files?.file;
      console.log("Получен файл: ", fileData);

      if (!topic|| !date || !text ){
        return next(ApiError.badRequest("Все поля (тема, дата, текст) обязательны"));
      }

      let fileName = null;
      if(fileData){
        fileName = iconv.decode(Buffer.from(fileData.name, 'latin1'), 'utf8');
        const filePath = path.resolve(__dirname, '..' ,'..', 'files', fileName);
        console.log(`Сохраняем файл по пути: ${filePath}`);
        await fileData.mv(filePath);
        console.log(`Файл успешно сохранён по пути: ${filePath}`);        
      }

      const news = await News.create({ topic, date, text, file: fileName });
      return res.json(news);
    } catch ( err ){
      return next(ApiError.internal(err.message));
    }
  }

  async getAll(req, res, next){
    try {
      const newsList = await News.findAll();
      return res.json(newsList);
    } catch ( err ){
      return next(ApiError.internal(err.message));
    }
  }

  async getOne(req, res, next){
    try {
      const { id } = req.params;
      const newsItem = await News.findByPk(id);
      if (!newsItem){
        return next(ApiError.notFound("Новость не найдена"));
      }
      return res.json(newsItem);
    } catch(err){
      return next(ApiError.internal(err.message));
    }
  }

  async update(req, res, next){
    try {
      const { id } = req.params;
      const { topic, date, text } = req.body;
      let fileData = req.files?.file;

      const newsItem = await News.findByPk(id);
      if(!newsItem){
        return next(ApiError.notFound("Новость не найдена"));
      }
      
      let fileName = newsItem.file;
      if(fileData){
        fileName = iconv.decode(Buffer.from(fileData.name, 'latin1'), 'utf8');
        const filePath = path.resolve(__dirname, '..', '..', 'files', fileName);
        await fileData.mv(filePath);
      }

      newsItem.topic = topic || newsItem.topic;
      newsItem.date = date || newsItem.date;
      newsItem.text = text || newsItem.text;
      newsItem.file = fileName;

      await newsItem.save();
      return res.json(newsItem);
    } catch (err){
      return next(ApiError.internal(err.message));
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const newsItem = await News.findByPk(id);
      if(!newsItem){
        return next(ApiError.notFound("Новость не найдена"));
      }
      

      if(newsItem.file){
        const filePath = path.resolve(__dirname, '..', 'files', newsItem.file);
        if (fs.existsSync(filePath)){
          fs.unlinkSync(filePath);
        }
      }

      await newsItem.destroy();
      return res.json({ message: "Новость удалена" });
    } catch (err){
      return next(ApiError.internal(err.message));
    }
  }
}

module.exports = new NewsController();