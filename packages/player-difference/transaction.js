const categories = require('./data/categories.json');
const { matchCategories, diffResponse } = require('./utils/category');
const { numberDiff } = require("./utils/common")
require("dotenv").config();
const { MongoClient } = require("mongodb")

const user = process.env.DB_USER;
const password = process.env.DB_PASS;
const host = process.env.DB_HOST;
const uri = `mongodb+srv://${user}:${password}@${host}`;
const databaseName = process.env.DB_NAME;

const mongoService = new MongoClient(uri);

const transaction = async ({newData, oldData, key, rosterId, leagueId}) => {

    const playerDB = mongoService.db(databaseName).collection('players')
    const transactionDB = mongoService.db(databaseName).collection('transactions')

    const player = await playerDB.findOne({rosterId, leagueId: Number(leagueId)})

    if(!player) return

    let category = ''

    const playerName = `${player.firstName} ${player.lastName}`
    let diffs = ''

    Object.keys(categories).forEach((catKey) => {
        if(categories[catKey].includes(key)){
            console.log('found category', catKey)
            category = catKey
        }
    })

    
    diffs = matchCategories(category, diffResponse(oldData, newData), numberDiff(oldData, newData))


    const payload = {
        statement: `${playerName} ${diffs}`,
        category,
        rosterId,
        leagueId,
        [key]: newData
    }

    if(category === 'personal') return

    await transactionDB.insertOne({...payload})
    console.log('inserted transaction')

}

module.exports = {
    transaction
}