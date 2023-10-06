const express = require('express');
require("dotenv").config();

const {
  MongoClient
} = require('mongodb')

const user = process.env.DB_USER;
const password = process.env.DB_PASS;
const host = process.env.DB_HOST;

const uri = `mongodb+srv://${user}:${password}@${host}`;

const databaseName = process.env.DB_NAME
const lastUpdated = new Date()
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

connectMongoDb();

const app = express();

app.set('port', (process.env.PORT || 3001));

app.get('*', (req, res) => {
  res.send('Madden Companion Exporter');
});

// LEAGUE INFO (TEAMS)
app.post('/:platform/:leagueId/leagueteams', (req, res) => {
  const {
    params: {
      leagueId
    }
  } = req;
  const bulk = mongoService.db(databaseName).collection('teams').initializeUnorderedBulkOp()
  const leagueIdNumber = Number(leagueId)

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', async () => {
    const {
      leagueTeamInfoList: teams
    } = JSON.parse(body);

    teams.forEach(team => {
      bulk.find({
        teamId: team.teamId,
        leagueId: leagueIdNumber
      }).upsert().replaceOne({
        ...team,
        leagueId: leagueIdNumber,
        lastUpdated
      })
    });

    await bulk.execute();

    res.sendStatus(200);
  });
});

// LEAGUE INFO (STANDINGS)
app.post('/:platform/:leagueId/standings', (req, res) => {
  const {
    params: {
      leagueId
    }
  } = req;

  const leagueIdNumber = Number(leagueId)

  const bulk = mongoService.db(databaseName).collection('standings').initializeUnorderedBulkOp()
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', async () => {
    const {
      teamStandingInfoList: teams
    } = JSON.parse(body);

    teams.forEach(team => {
      bulk.find({
        teamId: team.teamId,
        calendarYear: team.calendarYear,
        weekIndex: team.weekIndex,
        leagueId: leagueIdNumber
      }).upsert().replaceOne({
        ...team,
        leagueId: leagueIdNumber,
        lastUpdated
      })
    });

    await bulk.execute();
    res.sendStatus(200);
  });
});

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

app.post(
  '/:platform/:leagueId/week/:weekType/:weekNumber/:dataType',
  (req, res) => {
    const {
      params: {
        username,
        leagueId,
        weekType,
        weekNumber,
        dataType
      },
    } = req;

    const bulkTeamStats = mongoService.db(databaseName).collection('teamstats').initializeUnorderedBulkOp()
    const bulkPassingStats = mongoService.db(databaseName).collection('statsPassing').initializeUnorderedBulkOp()
    const bulkRushingStats = mongoService.db(databaseName).collection('statsRushing').initializeUnorderedBulkOp()
    const bulkReceivingStats = mongoService.db(databaseName).collection('statsReceiving').initializeUnorderedBulkOp()
    const bulkDefenseStats = mongoService.db(databaseName).collection('statsDefense').initializeUnorderedBulkOp()
    const bulkKickingStats = mongoService.db(databaseName).collection('statsKicking').initializeUnorderedBulkOp()
    const bulkPuntingStats = mongoService.db(databaseName).collection('statsPunting').initializeUnorderedBulkOp()

    const bulkSchedules = mongoService.db(databaseName).collection('schedules').initializeUnorderedBulkOp()

    const leagueIdNumber = Number(leagueId)
    const weekNumberNumber = Number(weekNumber)


    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      switch (dataType) {
        case 'schedules': {
          const {
            gameScheduleInfoList: schedules
          } = JSON.parse(body);

          console.log(schedules)

          schedules.forEach((schedule) => {
            bulkSchedules.find({
              seasonIndex: schedule.seasonIndex,
              weekIndex: schedule.weekIndex,
              scheduleId: schedule.scheduleId,
              leagueId: leagueIdNumber
            })
            .upsert()
            .replaceOne({
              ...schedule,
              weekType,
              weekNumber: weekNumberNumber,
              leagueId: leagueIdNumber,
              lastUpdated
            })
          })
          break;
        }
        case 'teamstats': {

          const {
            teamStatInfoList: teamStats
          } = JSON.parse(body);
          teamStats.forEach(stat => {
            bulkTeamStats
            .find({
              seasonIndex: stat.seasonIndex,
              statId: stat.statId,               
              weekIndex: stat.weekIndex,
              weekType,
              weekNumber: weekNumberNumber,
              scheduleId: stat.scheduleId,
              leagueId: leagueIdNumber
            })
            .upsert()
            .replaceOne({
              ...stat,
              weekType,
              weekNumber: weekNumberNumber,
              leagueId: leagueIdNumber,
              lastUpdated
            })
          });

          break;
        }
        case 'defense': {
          const {
            playerDefensiveStatInfoList: defensiveStats
          } = JSON.parse(body);

          defensiveStats.forEach(stat => {
            bulkDefenseStats
            .find({statId: stat.statId, weekType, weekIndex: stat.weekIndex, seasonIndex: stat.seasonIndex, leagueId: leagueIdNumber})
            .upsert()
            .replaceOne({
              ...stat,
              weekType,
              leagueId: leagueIdNumber,
              weekNumber: weekNumberNumber,
              lastUpdated
            })
          });
          break;
        }
        default: {
          const property = `player${capitalizeFirstLetter(dataType)}StatInfoList`;
          // not always an array; sometimes it's an object
          // TODO: catch error is not array
          const stats = JSON.parse(body)[property];

          stats.forEach(stat => {
            if (stat) {
              if (dataType === 'passing') {
                bulkPassingStats
                .find({statId: stat.statId, weekType, weekIndex: stat.weekIndex, seasonIndex: stat.seasonIndex, leagueId: leagueIdNumber})
                .upsert()
                .replaceOne({
                  ...stat,
                  weekType,
                  leagueId: leagueIdNumber,
                  weekNumber: weekNumberNumber,
                  lastUpdated
                })
              }
              if (dataType === 'rushing') {
                bulkRushingStats
                .find({statId: stat.statId, weekType, weekIndex: stat.weekIndex, seasonIndex: stat.seasonIndex, leagueId: leagueIdNumber})
                .upsert()
                .replaceOne({
                  ...stat,
                  weekType,
                  leagueId: leagueIdNumber,
                  weekNumber: weekNumberNumber,
                  lastUpdated
                })
              }
              if (dataType === 'receiving') {
                bulkReceivingStats
                .find({statId: stat.statId, weekType, weekIndex: stat.weekIndex, seasonIndex: stat.seasonIndex, leagueId: leagueIdNumber})
                .upsert()
                .replaceOne({
                  ...stat,
                  weekType,
                  leagueId: leagueIdNumber,
                  weekNumber: weekNumberNumber,
                  lastUpdated
                })
              }
              if (dataType === 'defense') {
                bulkDefenseStats
                .find({statId: stat.statId, weekType, weekIndex: stat.weekIndex, seasonIndex: stat.seasonIndex, leagueId: leagueIdNumber})
                .upsert()
                .replaceOne({
                  ...stat,
                  weekType,
                  leagueId: leagueIdNumber,
                  weekNumber: weekNumberNumber,
                  lastUpdated
                })
              }
              if (dataType === 'kicking') {
                bulkKickingStats
                .find({statId: stat.statId, weekType, weekIndex: stat.weekIndex, seasonIndex: stat.seasonIndex, leagueId: leagueIdNumber})
                .upsert()
                .replaceOne({
                  ...stat,
                  weekType,
                  leagueId: leagueIdNumber,
                  weekNumber: weekNumberNumber,
                  lastUpdated
                })
              }
              if (dataType === 'punting') {
                bulkPuntingStats
                .find({statId: stat.statId, weekType, weekIndex: stat.weekIndex, seasonIndex: stat.seasonIndex, leagueId: leagueIdNumber})
                .upsert()
                .replaceOne({
                  ...stat,
                  weekType,
                  leagueId: leagueIdNumber,
                  weekNumber: weekNumberNumber,
                  lastUpdated
                })
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
        bulkPuntingStats.execute()
      ])

      if (bulkTeamStats.length > 0) {
        await bulkTeamStats.execute()
      }
      if(bulkSchedules.length > 0) {
        await bulkSchedules.execute()
      }


      res.sendStatus(200);
    });
  }
);

// ROSTERS
app.post('/:platform/:leagueId/freeagents/roster', (req, res) => {
  const {
    params: {
      username,
      leagueId,
      teamId
    }
  } = req;
  let body = '';

  const bulk = mongoService.db(databaseName).collection('players').initializeUnorderedBulkOp()

  const leagueIdNumber = Number(leagueId)

  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', async () => {
    const {
      rosterInfoList
    } = JSON.parse(body);

    if (!rosterInfoList) {
      res.sendStatus('500')
      return
    }

    rosterInfoList.forEach(player => {
      bulk.find({
        rosterId: player.rosterId,
        leagueId: leagueIdNumber
      }).upsert().replaceOne({
        ...player,
        leagueId: leagueIdNumber
      })
    });

    await bulk.execute();
    res.sendStatus(200);
  });
});

// ROSTER
app.post('/:platform/:leagueId/team/:teamId/roster', async (req, res) => {
  const {
    params: {
      username,
      leagueId,
      teamId
    }
  } = req;
  let body = '';

  const bulk = mongoService.db(databaseName).collection('players').initializeUnorderedBulkOp()

  const leagueIdNumber = Number(leagueId)

  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', async () => {
    const {
      rosterInfoList
    } = JSON.parse(body);

    if (!rosterInfoList) {
      res.sendStatus('500')
      return
    }

    rosterInfoList.forEach(player => {
      bulk.find({
        rosterId: player.rosterId,
        leagueId: leagueIdNumber
      }).upsert().replaceOne({
        ...player,
        leagueId: leagueIdNumber
      })
    });

    await bulk.execute();
    res.sendStatus(200);
  });
});

app.listen(app.get('port'), () =>
  console.log('Madden Data is running on port', app.get('port'))
);