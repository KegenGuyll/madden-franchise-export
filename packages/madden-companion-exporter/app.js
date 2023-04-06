const express = require("express");
const redis = require("redis");
require("dotenv").config();

const { MongoClient } = require("mongodb");
const { compareObject } = require("./utils/compare");

const user = process.env.DB_USER;
const password = process.env.DB_PASS;
const host = process.env.DB_HOST;
const redisPassword = process.env.REDIS_PASSWORD;

const uri = `mongodb+srv://${user}:${password}@${host}`;

const databaseName = process.env.DB_NAME;
const lastUpdated = new Date();
const mongoService = new MongoClient(uri);
const redisService = redis.createClient({
  url: "redis://redis:6379",
  password: redisPassword,
});

const leagueIdCollection = mongoService
  .db(databaseName)
  .collection("leagueIds");

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

const connectRedis = async () => {
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

connectMongoDb();
connectRedis();

const app = express();

app.set("port", process.env.PORT || 3001);

app.get("*", (req, res) => {
  res.send("Madden Companion Exporter");
});

// LEAGUE INFO (TEAMS)
app.post("/:platform/:leagueId/leagueteams", (req, res) => {
  const {
    params: { leagueId },
  } = req;
  const bulk = mongoService
    .db(databaseName)
    .collection("teams")
    .initializeUnorderedBulkOp();
  const leagueIdNumber = Number(leagueId);

  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", async () => {
    const { leagueTeamInfoList: teams } = JSON.parse(body);

    teams.forEach((team) => {
      bulk
        .find({
          teamId: team.teamId,
          leagueId: leagueIdNumber,
        })
        .upsert()
        .replaceOne({
          ...team,
          leagueId: leagueIdNumber,
          lastUpdated,
        });
    });

    await bulk.execute();

    res.sendStatus(200);
  });
});

// LEAGUE INFO (STANDINGS)
app.post("/:platform/:leagueId/standings", (req, res) => {
  const {
    params: { leagueId },
  } = req;

  const leagueIdNumber = Number(leagueId);

  const bulk = mongoService
    .db(databaseName)
    .collection("standings")
    .initializeUnorderedBulkOp();
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", async () => {
    const { teamStandingInfoList: teams } = JSON.parse(body);

    teams.forEach((team) => {
      bulk
        .find({
          teamId: team.teamId,
          calendarYear: team.calendarYear,
          weekIndex: team.weekIndex,
          leagueId: leagueIdNumber,
        })
        .upsert()
        .replaceOne({
          ...team,
          leagueId: leagueIdNumber,
          lastUpdated,
        });
    });

    await bulk.execute();
    res.sendStatus(200);
  });
});

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

app.post(
  "/:platform/:leagueId/week/:weekType/:weekNumber/:dataType",
  (req, res) => {
    const {
      params: { username, leagueId, weekType, weekNumber, dataType },
    } = req;

    const bulkTeamStats = mongoService
      .db(databaseName)
      .collection("teamstats")
      .initializeUnorderedBulkOp();
    const bulkPassingStats = mongoService
      .db(databaseName)
      .collection("statsPassing")
      .initializeUnorderedBulkOp();
    const bulkRushingStats = mongoService
      .db(databaseName)
      .collection("statsRushing")
      .initializeUnorderedBulkOp();
    const bulkReceivingStats = mongoService
      .db(databaseName)
      .collection("statsReceiving")
      .initializeUnorderedBulkOp();
    const bulkDefenseStats = mongoService
      .db(databaseName)
      .collection("statsDefense")
      .initializeUnorderedBulkOp();
    const bulkKickingStats = mongoService
      .db(databaseName)
      .collection("statsKicking")
      .initializeUnorderedBulkOp();
    const bulkPuntingStats = mongoService
      .db(databaseName)
      .collection("statsPunting")
      .initializeUnorderedBulkOp();

    const bulkSchedules = mongoService
      .db(databaseName)
      .collection("schedules")
      .initializeUnorderedBulkOp();

    const leagueIdNumber = Number(leagueId);
    const weekNumberNumber = Number(weekNumber);

    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      switch (dataType) {
        case "schedules": {
          const { gameScheduleInfoList: schedules } = JSON.parse(body);

          schedules.forEach((schedule) => {
            bulkSchedules
              .find({
                seasonIndex: schedule.seasonIndex,
                weekIndex: schedule.weekIndex,
                scheduleId: schedule.scheduleId,
                leagueId: leagueIdNumber,
              })
              .upsert()
              .replaceOne({
                ...schedule,
                weekType,
                weekNumber: weekNumberNumber,
                leagueId: leagueIdNumber,
                lastUpdated,
              });
          });
          break;
        }
        case "teamstats": {
          const { teamStatInfoList: teamStats } = JSON.parse(body);
          teamStats.forEach((stat) => {
            bulkTeamStats
              .find({
                seasonIndex: stat.seasonIndex,
                statId: stat.statId,
                weekIndex: stat.weekIndex,
                weekType,
                weekNumber: weekNumberNumber,
                scheduleId: stat.scheduleId,
                leagueId: leagueIdNumber,
              })
              .upsert()
              .replaceOne({
                ...stat,
                weekType,
                weekNumber: weekNumberNumber,
                leagueId: leagueIdNumber,
                lastUpdated,
              });
          });

          break;
        }
        case "defense": {
          const { playerDefensiveStatInfoList: defensiveStats } =
            JSON.parse(body);

          defensiveStats.forEach((stat) => {
            bulkDefenseStats
              .find({
                statId: stat.statId,
                weekType,
                weekIndex: stat.weekIndex,
                seasonIndex: stat.seasonIndex,
                leagueId: leagueIdNumber,
              })
              .upsert()
              .replaceOne({
                ...stat,
                weekType,
                leagueId: leagueIdNumber,
                weekNumber: weekNumberNumber,
                lastUpdated,
              });
          });
          break;
        }
        default: {
          const property = `player${capitalizeFirstLetter(
            dataType
          )}StatInfoList`;
          const stats = JSON.parse(body)[property];
          stats.forEach((stat) => {
            if (stat) {
              if (dataType === "passing") {
                bulkPassingStats
                  .find({
                    statId: stat.statId,
                    weekType,
                    weekIndex: stat.weekIndex,
                    seasonIndex: stat.seasonIndex,
                    leagueId: leagueIdNumber,
                  })
                  .upsert()
                  .replaceOne({
                    ...stat,
                    weekType,
                    leagueId: leagueIdNumber,
                    weekNumber: weekNumberNumber,
                    lastUpdated,
                  });
              }
              if (dataType === "rushing") {
                bulkRushingStats
                  .find({
                    statId: stat.statId,
                    weekType,
                    weekIndex: stat.weekIndex,
                    seasonIndex: stat.seasonIndex,
                    leagueId: leagueIdNumber,
                  })
                  .upsert()
                  .replaceOne({
                    ...stat,
                    weekType,
                    leagueId: leagueIdNumber,
                    weekNumber: weekNumberNumber,
                    lastUpdated,
                  });
              }
              if (dataType === "receiving") {
                bulkReceivingStats
                  .find({
                    statId: stat.statId,
                    weekType,
                    weekIndex: stat.weekIndex,
                    seasonIndex: stat.seasonIndex,
                    leagueId: leagueIdNumber,
                  })
                  .upsert()
                  .replaceOne({
                    ...stat,
                    weekType,
                    leagueId: leagueIdNumber,
                    weekNumber: weekNumberNumber,
                    lastUpdated,
                  });
              }
              if (dataType === "defense") {
                bulkDefenseStats
                  .find({
                    statId: stat.statId,
                    weekType,
                    weekIndex: stat.weekIndex,
                    seasonIndex: stat.seasonIndex,
                    leagueId: leagueIdNumber,
                  })
                  .upsert()
                  .replaceOne({
                    ...stat,
                    weekType,
                    leagueId: leagueIdNumber,
                    weekNumber: weekNumberNumber,
                    lastUpdated,
                  });
              }
              if (dataType === "kicking") {
                bulkKickingStats
                  .find({
                    statId: stat.statId,
                    weekType,
                    weekIndex: stat.weekIndex,
                    seasonIndex: stat.seasonIndex,
                    leagueId: leagueIdNumber,
                  })
                  .upsert()
                  .replaceOne({
                    ...stat,
                    weekType,
                    leagueId: leagueIdNumber,
                    weekNumber: weekNumberNumber,
                    lastUpdated,
                  });
              }
              if (dataType === "punting") {
                bulkPuntingStats
                  .find({
                    statId: stat.statId,
                    weekType,
                    weekIndex: stat.weekIndex,
                    seasonIndex: stat.seasonIndex,
                    leagueId: leagueIdNumber,
                  })
                  .upsert()
                  .replaceOne({
                    ...stat,
                    weekType,
                    leagueId: leagueIdNumber,
                    weekNumber: weekNumberNumber,
                    lastUpdated,
                  });
              }
            }
          });
          break;
        }
      }

      await Promise.allSettled([
        bulkPassingStats.execute(),
        bulkRushingStats.execute(),
        bulkReceivingStats.execute(),
        bulkDefenseStats.execute(),
        bulkKickingStats.execute(),
        bulkPuntingStats.execute(),
      ]);

      if (bulkTeamStats.length > 0) {
        await bulkTeamStats.execute();
      }
      if (bulkSchedules.length > 0) {
        await bulkSchedules.execute();
      }

      res.sendStatus(200);
    });
  }
);

// ROSTERS
app.post("/:platform/:leagueId/freeagents/roster", (req, res) => {
  const {
    params: { username, leagueId, teamId, platform },
  } = req;
  let body = "";

  console.log(`/${platform}/${leagueId}/team/${teamId}/roster`)

  const db = mongoService.db(databaseName).collection("players");

  const leagueIdNumber = Number(leagueId);

  req.on("data", (chunk) => {
    console.log('process data')
    body += chunk.toString();
  });
  req.on("end", async () => {
    try {
      
      console.log('ready to begin ingest')
      const { rosterInfoList, message, success } = JSON.parse(body);
      console.log(`message: ${message}`)
      console.log('success:', success)

      if (!rosterInfoList) {
        res.sendStatus("500");
        return;
      }

      const id = await leagueIdCollection.findOne({ leagueId });

      if (!id) {
        console.log('insert leagueId')
        await leagueIdCollection.insertOne({ leagueId });
      }

      await Promise.all(
        rosterInfoList.map(async (player) => {
          console.log('find player')
          const content = await db.findOne({
            rosterId: player.rosterId,
            leagueId: leagueIdNumber,
          });

          if (content) {
            console.log('found player')
            const result = compareObject(content, {
              ...player,
              leagueId: leagueIdNumber,
            }, leagueIdNumber);

            if (result._id) {
              delete result._id;
            }

            if(result.length){
              console.log('publish redis channel')
              await redisService.publish(leagueId, JSON.stringify(result));
            }

            console.log('update player')
            await db.updateOne({
              rosterId: player.rosterId,
              leagueId: leagueIdNumber,
            }, [{ $set: { ...player, leagueId: leagueIdNumber } }]);
          } else {
            console.log('create player')
            await db.insertOne({
              ...player,
              leagueId: leagueIdNumber,
            });
          }
        })
      );

      res.sendStatus(200);
    } catch (error) {
      console.log(error);
    }
  });
});

// ROSTER
app.post("/:platform/:leagueId/team/:teamId/roster", async (req, res) => {
  const {
    params: { username, leagueId, teamId, platform },
  } = req;
  let body = "";

  console.log(`/${platform}/${leagueId}/team/${teamId}/roster`)

  const db = mongoService.db(databaseName).collection("players");

  const leagueIdNumber = Number(leagueId);

  req.on("data", (chunk) => {
    console.log('process data')
    body += chunk.toString();
  });
  req.on("end", async () => {
    try {
      
      console.log('ready to begin ingest')
      const { rosterInfoList, message, success } = JSON.parse(body);
      console.log(`message: ${message}`)
      console.log('success:', success)

      if (!rosterInfoList) {
        res.sendStatus("500");
        return;
      }

      const id = await leagueIdCollection.findOne({ leagueId });

      if (!id) {
        console.log('insert leagueId')
        await leagueIdCollection.insertOne({ leagueId });
      }

      await Promise.all(
        rosterInfoList.map(async (player) => {
          console.log('find player')
          const content = await db.findOne({
            rosterId: player.rosterId,
            leagueId: leagueIdNumber,
          });

          if (content) {
            console.log('found player')
            const result = compareObject(content, {
              ...player,
              leagueId: leagueIdNumber,
            }, leagueIdNumber);

            if (result._id) {
              delete result._id;
            }

            if(result.length){
              console.log('publish redis channel')
              await redisService.publish(leagueId, JSON.stringify(result));
            }

            console.log('update player')
            await db.updateOne({
              rosterId: player.rosterId,
              leagueId: leagueIdNumber,
            }, [{ $set: { ...player, leagueId: leagueIdNumber } }]);
          } else {
            console.log('create player')
            await db.insertOne({
              ...player,
              leagueId: leagueIdNumber,
            });
          }
        })
      );

      res.sendStatus(200);
    } catch (error) {
      console.log(error);
    }
  });
});

app.listen(app.get("port"), () =>
  console.log("Madden Data is running on port", app.get("port"))
);

const disconnect = async () => {
  await mongoService.close();
  await redisService.disconnect();
};

process.stdin.resume(); //so the program will not close instantly

function exitHandler(options, exitCode) {
  if (options.cleanup) disconnect();
  if (exitCode || exitCode === 0) disconnect();
  if (options.exit) {
    disconnect().then(() => process.exit());
  }
}

//do something when app is closing
process.on("exit", exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on("SIGINT", exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));
process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
process.on("uncaughtException", exitHandler.bind(null, { exit: true }));
