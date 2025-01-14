const fs = require('fs');
const { Answer } = require('../models/models');
const ApiError = require('../error/ApiError');
const path = require('path');
const iconv = require('iconv-lite');
const sequelize = require('../db');

class AnswerController {
    async create(req, res, next) {
        console.log('Create answer route hit');
        try {
            const { quest, isnode, answertype, parentid } = req.body;
            let answerFile = req.files?.answer;

            const existingAnswer = await Answer.findOne({ where: { quest } });
            if (existingAnswer) {
                return next(ApiError.badRequest("Названный документ уже существует"));
            }

            let fileName = null;
            if (answerFile) {
                const extension = path.extname(answerFile.name);
                // Конвертация имени файла в UTF-8
                fileName = iconv.decode(Buffer.from(answerFile.name, 'latin1'), 'utf8');
                const filePath = path.resolve(__dirname, '..', '..', 'files', fileName);
                answerFile.mv(filePath);
            }

            const answers = await Answer.create({ quest, isnode, answer: fileName || quest, answertype, parentid });
            return res.json(answers);
        } catch (e) {
            next(ApiError.badRequest(e.message));
        }
    }

    async getAll(req, res) {
        let answers = await Answer.findAndCountAll({
            order: [['id', 'ASC']], // сортировка по ID (возрастание)
        });
        return res.json(answers);
    }
    
    async getOne(req, res) {
        const { id } = req.params;
        const answer = await Answer.findOne({ where: { id } });
        return res.json(answer);
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const category = await Answer.findByPk(id);

            if (!category) {
                return next(ApiError.badRequest("Категория не найдена"));
            }

            const answersToDelete = await Answer.findAll({ where: { parentid: id } });
            for (const answer of answersToDelete) {
                const filePath = path.resolve(__dirname, '..', '..', 'files', answer.answer);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                await answer.destroy();
            }

            await category.destroy();
            return res.json({ message: 'Категория и связанные ряды удалены' });
        } catch (error) {
            console.error('Delete Error:', error.message);
            next(ApiError.internal('Ошибка при удалении категории'));
        }
    }

    async swapCategoriesAndSubs(req, res, next) {
        // Получаем id категорий из тела запроса
        const { idA, idB } = req.body;

        // Открываем транзакцию
        const t = await sequelize.transaction();
        try {
            // 1) Проверяем, существуют ли такие категории
            const catA = await Answer.findByPk(idA, { transaction: t });
            const catB = await Answer.findByPk(idB, { transaction: t });

            if (!catA || !catB) {
                await t.rollback();
                return next(ApiError.badRequest('Одна из категорий не найдена.'));
            }

            // Допустим, вы хотите удостовериться, что это действительно категории (isnode = true).
            // Если нужно, делаем проверку:
            if (!catA.isnode || !catB.isnode) {
                await t.rollback();
                return next(ApiError.badRequest('Оба id должны быть категориями (isnode = true).'));
            }

            // 2) «Освобождаем» A -> -9999
            await Answer.update(
                { id: -9999 },
                { where: { id: idA }, transaction: t }
            );
            // 3) Меняем B -> A
            await Answer.update(
                { id: idA },
                { where: { id: idB }, transaction: t }
            );
            // 4) Меняем -9999 -> B
            await Answer.update(
                { id: idB },
                { where: { id: -9999 }, transaction: t }
            );

            // Теперь у нас, фактически, категория с исходным idA имеет idB, и наоборот.

            // 5) Меняем подкатегории (isnode = false) «дочерние» от A ↔ B
            //    - Все подкатегории, у которых parentid = A, должны перейти к B
            //    - Все подкатегории, у которых parentid = B, должны перейти к A
            //    - Но после предыдущих операций «A» и «B» уже поменялись местами!
            //    
            //    Чтобы не запутаться, смотрите логику:
            //    - До свапа у подкатегорий было parentid = idA или parentid = idB
            //    - После шага с категориями, "категория A" теперь хранится под id = idB,
            //      а "категория B" — под id = idA.
            //
            // Поэтому мы меняем parentid, используя ту же «промежуточную» схему:
            const TEMP_PARENT = -9999;

            // 5.1) Всё, что указывало на idA (старый), ставим во временный TEMP_PARENT
            await Answer.update(
                { parentid: TEMP_PARENT },
                { 
                  where: { parentid: idA, isnode: false },
                  transaction: t
                }
            );
            // 5.2) Всё, что указывало на idB (старый), ставим на idA (т.к. idB теперь стало idA)
            await Answer.update(
                { parentid: idA },
                {
                  where: { parentid: idB, isnode: false },
                  transaction: t
                }
            );
            // 5.3) Всё, что указывало на TEMP_PARENT, ставим на idB (т.к. idA теперь стало idB)
            await Answer.update(
                { parentid: idB },
                {
                  where: { parentid: TEMP_PARENT, isnode: false },
                  transaction: t
                }
            );

            await t.commit();
            return res.json({ message: `Категории #${idA} и #${idB} (и их подкатегории) успешно поменялись местами!` });
        } catch (err) {
            await t.rollback();
            return next(ApiError.internal('Ошибка при свапе: ' + err.message));
        }
    }

    async swapSubs(req, res, next){
        const { subIdA, subIdB } = req.body;

        const t =await sequelize.transaction();
        try {
            const subA = await Answer.findByPk(subIdA, { transaction: t });
            const subB = await Answer.findByPk(subIdB, { transaction: t });

            if(!subA || !subB){
                await t.rollback();
                return next(ApiError.badRequest(' Одна из подкатегорий не найдена.'));
            }

            //Проверяем являются ли обе подкатегориями
            if(subA.isnode || subB.isnode) {
                await t.rollback();
                return next(ApiError.badRequest('Обе записи должны быть подкатегориями!'));
            }

            //промежуточное значение
            const TEMP_ID = -9999;

            await Answer.update(
                { id: TEMP_ID },
                { where: { id: subIdA}, transaction: t }
            );

            await Answer.update(
                { id: subIdA },
                { where: { id: subIdB}, transaction: t }
            );

            await Answer.update(
                { id: subIdB },
                { where: { id: TEMP_ID }, transaction: t}
            );

            await t.commit();
            return res.json({ message: `Поткатегории #${subIdA} и #${subIdB} успешно поменялись местами!` });
        } catch (err){
            await t.rollback();
            return next(ApiError.internal('Ошибка при свапе: ' + err.message));
        }
    }
}

module.exports = new AnswerController();