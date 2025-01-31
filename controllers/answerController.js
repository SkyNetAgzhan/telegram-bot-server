const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const ApiError = require('../error/ApiError');
const sequelize = require('../db');
const { Answer } = require('../models/models');

class AnswerController {
    /**
     * Создаёт запись (категорию или документ) в таблице answers.
     */
    async create(req, res, next) {
        try {
            const { quest, isnode, answertype, parentid } = req.body;
            let answerFile = req.files?.answer;

            // Проверка, нет ли уже такой записи
            const existingAnswer = await Answer.findOne({ where: { quest } });
            if (existingAnswer) {
                return next(ApiError.badRequest("Названный документ уже существует"));
            }

            let fileName = null;
            if (answerFile) {
                // Конвертируем имя, если нужно
                fileName = iconv.decode(Buffer.from(answerFile.name, 'latin1'), 'utf8');
                const filePath = path.resolve(__dirname, '..', '..', 'files', fileName);
                await answerFile.mv(filePath);
            }

            // Создаём запись в БД
            const newAnswer = await Answer.create({
                quest,
                isnode,
                answer: fileName || quest,
                answertype,
                parentid
            });
            return res.json(newAnswer);
        } catch (e) {
            console.error('Create Error:', e);
            return next(ApiError.badRequest(e.message));
        }
    }

    /**
     * Возвращает все записи (с подсчётом).
     */
    async getAll(req, res, next) {
        try {
            const answers = await Answer.findAndCountAll({
                order: [['id','ASC']]
            });
            return res.json(answers); // { rows: [...], count: N }
        } catch (err) {
            return next(ApiError.internal(err.message));
        }
    }

    /**
     * Возвращает одну запись по ID.
     */
    async getOne(req, res, next) {
        try {
            const { id } = req.params;
            const found = await Answer.findByPk(id);
            if (!found) {
                return next(ApiError.badRequest(`Запись #${id} не найдена`));
            }
            return res.json(found);
        } catch (err) {
            return next(ApiError.internal(err.message));
        }
    }

    /**
     * Удаление записи (категории или документа).
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const record = await Answer.findByPk(id);
            if (!record) {
                return next(ApiError.badRequest('Запись не найдена'));
            }

            // Если это файл, удалим его физически
            if (!record.isnode && record.answer) {
                const filePath = path.resolve(__dirname, '..', '..', 'files', record.answer);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            // Можно также удалить всех «детей» (если isnode=true),
            // но это зависит от вашей логики. 
            // Сейчас просто удаляем саму запись:
            await record.destroy();
            return res.json({ message: `Запись #${id} удалена` });
        } catch (err) {
            console.error('Delete Error:', err);
            return next(ApiError.internal(err.message));
        }
    }

    /**
     * Свап двух «категорий» (idA, idB) + их прямых детей
     * (то есть у кого parentid=idA, станет parentid=idB, и наоборот).
     * Меняется сам ID категорий (A->B, B->A).
     */
    async swapCategoriesAndSubs(req, res, next) {
        const { idA, idB } = req.body;
        const t = await sequelize.transaction();
        try {
            const catA = await Answer.findByPk(idA, { transaction: t });
            const catB = await Answer.findByPk(idB, { transaction: t });
            if (!catA || !catB) {
                await t.rollback();
                return next(ApiError.badRequest('Одна из категорий не найдена.'));
            }

            // 1) Освобождаем A => -9999
            await Answer.update(
                { id: -9999 },
                { where: { id: idA }, transaction: t }
            );
            // 2) B => A
            await Answer.update(
                { id: idA },
                { where: { id: idB }, transaction: t }
            );
            // 3) -9999 => B
            await Answer.update(
                { id: idB },
                { where: { id: -9999 }, transaction: t }
            );

            // 4) Меняем parentid у всех, кто ссылался на A => теперь B,
            //    и у всех, кто ссылался на B => теперь A.
            //    ВАЖНО: убираем любое условие isnode, 
            //    чтобы затронуть и «подкатегории», и «документы».
            const TEMP_PARENT = -9999;

            // Всё, что указывало на old-A => TEMP
            await Answer.update(
                { parentid: TEMP_PARENT },
                { where: { parentid: idA }, transaction: t }
            );
            // Всё, что указывало на old-B => A
            await Answer.update(
                { parentid: idA },
                { where: { parentid: idB }, transaction: t }
            );
            // Всё, что указывало на TEMP => B
            await Answer.update(
                { parentid: idB },
                { where: { parentid: TEMP_PARENT }, transaction: t }
            );

            await t.commit();
            return res.json({
                message: `Категории #${idA} и #${idB} (и их прямые дети) успешно поменялись местами`
            });
        } catch (err) {
            await t.rollback();
            return next(ApiError.internal('Ошибка при свапе категорий: ' + err.message));
        }
    }

    /**
     * Свап двух «подкатегорий» (subIdA, subIdB) — 
     * просто меняем их ID и всё, для «прямого» обмена.
     */
    async swapSubs(req, res, next) {
        const { subIdA, subIdB } = req.body;
        const t = await sequelize.transaction();
        try {
            // 1) Получаем сами записи
            const subA = await Answer.findByPk(subIdA, { transaction: t });
            const subB = await Answer.findByPk(subIdB, { transaction: t });
            if (!subA || !subB) {
                await t.rollback();
                return next(ApiError.badRequest('Одна из подкатегорий не найдена.'));
            }
    
            // 2) Меняем ID:
            //   subA => -9999,
            //   subB => subA,
            //   -9999 => subB
            await Answer.update(
                { id: -9999 },
                { where: { id: subIdA }, transaction: t }
            );
            await Answer.update(
                { id: subIdA },
                { where: { id: subIdB }, transaction: t }
            );
            await Answer.update(
                { id: subIdB },
                { where: { id: -9999 }, transaction: t }
            );
    
            // 3) Меняем parentid у прямых детей:
            //   Всё, что ссылалось на subA => теперь subB
            //   Всё, что ссылалось на subB => теперь subA
            //   (по аналогии с swapCategoriesAndSubs)
            const TEMP_PARENT = -9999;
    
            // parentid=subA => TEMP
            await Answer.update(
                { parentid: TEMP_PARENT },
                { where: { parentid: subIdA }, transaction: t }
            );
            // parentid=subB => subA
            await Answer.update(
                { parentid: subIdA },
                { where: { parentid: subIdB }, transaction: t }
            );
            // parentid=TEMP => subB
            await Answer.update(
                { parentid: subIdB },
                { where: { parentid: TEMP_PARENT }, transaction: t }
            );
    
            await t.commit();
            return res.json({
                message: `Подкатегории #${subIdA} и #${subIdB} (и их дети) успешно поменялись местами!`
            });
        } catch (err) {
            await t.rollback();
            return next(ApiError.internal('Ошибка при свапе подкатегорий: ' + err.message));
        }
    }    
}

module.exports = new AnswerController();
