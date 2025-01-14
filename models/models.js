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

module.exports = {
    User,
    Answer
};
