const redis = require("redis");
const { MongoClient } = require("mongodb");
const { transaction } = require("./transaction");
require("dotenv").config();

const user = process.env.DB_USER;
const password = process.env.DB_PASS;
const host = process.env.DB_HOST;
const uri = `mongodb+srv://${user}:${password}@${host}`;
const databaseName = process.env.DB_NAME;
const redisPassword = process.env.REDIS_PASSWORD;

const redisService = redis.createClient({
  url: "redis://redis:6379",
  password: redisPassword,
});
const mongoService = new MongoClient(uri);

const connectMongoDb = () => {
  mongoService
    .connect()
    .then(() => {
      console.log("mongodb is connected");
    })
    .catch((e) => {
      console.error(e);
    });
};

const connectRedis = () => {
  redisService.on("error", (err) => console.error("Redis Client Error", err));

  redisService
    .connect()
    .then(() => {
      console.log("redis connected");
    })
    .catch((err) => {
      console.error("Redis Error", err);
    });
};

connectRedis();
connectMongoDb();

redisService.on("ready", () => subscribe());

const listener = async (message, channel) => {
  try {
    console.log(message);
    const JSONmessage = JSON.parse(message);

    const db = mongoService.db(databaseName).collection("player-history");

    await Promise.all(
      JSONmessage.map(
        async ({ newData, oldData, key, leagueId, rosterId, date }) => {
          const playerHistory = await db.findOne({ rosterId, leagueId });

          if (playerHistory) {
            if (playerHistory._id) delete playerHistory._id;

            if(playerHistory[key]) {
              const history = {
                ...playerHistory,
                [key]: [
                  {
                    value: newData,
                    oldValue: oldData,
                    date,
                  },
                  ...playerHistory[key],
                ],
              };

              await db.updateOne(
                { rosterId, leagueId },
                { $set: { ...history } }
              );
              await transaction({newData, oldData, key, rosterId, leagueId})
            } else {
              const history = {
                ...playerHistory,
                [key]: [
                  {
                    value: newData,
                    oldValue: oldData,
                    date,
                  }
                ],
              };



              await db.updateOne(
                { rosterId, leagueId },
                { $set: { ...history } }
              );
              await transaction({newData, oldData, key, rosterId, leagueId})
            }

            console.log("updated");
          } else {
            const history = {
              rosterId,
              leagueId,
              [key]: [
                {
                  value: newData,
                  oldValue: oldData,
                  date,
                },
              ],
            };

            await db.insertOne({ ...history });
            console.log("added");
          }
        }
      )
    );
  } catch (err) {
    console.log(err);
  }
};

const subscribe = async () => {
  try {
    console.log("entered subscribe");
    const db = mongoService.db(databaseName).collection("leagueIds");
    const changeStream = db.watch();
    const results = await db.find({}).toArray();

    if (results.length) {
      // subscribes to all leagueIds in db
      await Promise.all(
        results.map(async ({ leagueId }) => {
          await redisService.subscribe(leagueId, listener);
        })
      );
    }

    // watches collection of leagueId and subscribes to any new ones
    for await (const change of changeStream) {
      console.log("change stream");
      if (change.fullDocument.leagueId) {
        await redisService.subscribe(change.fullDocument.leagueId, listener);
      }
    }
  } catch (error) {
    console.error(error);
  }
};