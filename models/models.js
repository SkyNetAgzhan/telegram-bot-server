const sequelize = require('../db');
const { DataTypes } = require('sequelize');

const User = sequelize.define('user', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING, unique: true },
    password: { type: DataTypes.STRING },
    role: { type: DataTypes.STRING, defaultValue: "USER" }
});

const Answer = sequelize.define('answer', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    quest: { type: DataTypes.STRING, unique: true, allowNull: false },
    isnode: { type: DataTypes.BOOLEAN, defaultValue: false },
    answer: { type: DataTypes.STRING, allowNull: true },
    answertype: { type: DataTypes.STRING, allowNull: true },
    parentid: { type: DataTypes.INTEGER, allowNull: true }
});

// Родитель -> Дети
Answer.hasMany(Answer, {
    foreignKey: 'parentid',
    as: 'children',
    onDelete: 'CASCADE'
});

// Ребёнок -> Родитель
Answer.belongsTo(Answer, {
    foreignKey: 'parentid',
    as: 'parent'
});

const Poll = sequelize.define('poll', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    questionRu: {type: DataTypes.STRING, allowNull:false},
    questionKz: {type: DataTypes.STRING, allowNull: false},
});

const PollOption = sequelize.define('poll_option', {
    id: {type:DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    pollId: {type:DataTypes.INTEGER, allowNull: false},
    optionTextRu: {type: DataTypes.STRING, allowNull: false},
    optionTextKz: {type: DataTypes.STRING, allowNull: false},
});

const PollVote = sequelize.define('poll_vote', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    pollId: { type: DataTypes.INTEGER, allowNull: false },
    optionId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false},
});

Poll.hasMany(PollOption, { foreignKey: 'pollId', onDelete: 'CASCADE' });
PollOption.belongsTo(Poll, { foreignKey: 'pollId' });

PollOption.hasMany(PollVote, { foreignKey: 'optionId', onDelete: 'CASCADE' });
PollVote.belongsTo(PollOption, { foreignKey: 'optionId' });

module.exports = {
    User,
    Answer,
    Poll,
    PollOption,
    PollVote
};