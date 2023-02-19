const express = require('express');
require("dotenv").config();

const {
  MongoClient
} = require('mongodb')

const user = process.env.DB_USER;
const password = process.env.DB_PASS;
const host = process.env.DB_HOST;

const uri = `mongodb+srv://${user}:${password}@${host}`;

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

// LEAGUE INFO
app.post('/:platform/:leagueId/leagueteams', (req, res) => {
  const {
    params: {
      leagueId
    }
  } = req;
  const bulk = mongoService.db(leagueId).collection('teams').initializeUnorderedBulkOp()

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
        calendarYear: team.calendarYear
      }).upsert().replaceOne({
        ...team
      })
    });

    await bulk.execute();

    res.sendStatus(200);
  });
});

// LEAGUE INFO
app.post('/:platform/:leagueId/standings', (req, res) => {
  const {
    params: {
      leagueId
    }
  } = req;

  const bulk = mongoService.db(leagueId).collection('standings').initializeUnorderedBulkOp()
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
        teamId: team.teamId
      }).upsert().replaceOne({
        ...team
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
    const basePath = `data/${username}/${leagueId}/`;
    // "defense", "kicking", "passing", "punting", "receiving", "rushing"
    const statsPath = `${basePath}stats`;


    const bulkTeamStats = mongoService.db(leagueId).collection('teamstats').initializeUnorderedBulkOp()
    const bulkPlayerStats = mongoService.db(leagueId).collection('playerstats').initializeUnorderedBulkOp()


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

          mongoService.db(leagueId).collection("schedules").insertMany(schedules)
          break;
        }
        case 'teamstats': {

          const {
            teamStatInfoList: teamStats
          } = JSON.parse(body);
          teamStats.forEach(stat => {
            bulkTeamStats
            .find({statId: stat.statId})
            .upsert()
            .replaceOne({
              ...stat,
              weekType,
              weekNumber,
            })
          });

          break;
        }
        case 'defense': {
          const {
            playerDefensiveStatInfoList: defensiveStats
          } = JSON.parse(body);

          defensiveStats.forEach(stat => {
            bulkPlayerStats
            .find({statId: stat.statId})
            .upsert()
            .replaceOne({
              ...stat,
              weekType,
              weekNumber,
              dataType
            })
          });
          break;
        }
        default: {
          const property = `player${capitalizeFirstLetter(dataType)}StatInfoList`;
          const stats = JSON.parse(body)[property];

          stats.forEach(stat => {
            if (stat) {
              bulkPlayerStats
              .find({statId: stat.statId})
              .upsert()
              .replaceOne({
                ...stat,
                dataType,
                weekType,
                weekNumber
              })
            }

          });
          break;
        }
      }
      
      if (bulkPlayerStats.length > 0) {
        await bulkPlayerStats.execute()
      }
      if (bulkTeamStats.length > 0) {
        await bulkTeamStats.execute()
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

  const bulk = mongoService.db(leagueId).collection('players').initializeUnorderedBulkOp()

  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', async () => {
    const {
      rosterInfoList
    } = JSON.parse(body);

    console.log(JSON.parse(body))

    if (!rosterInfoList) {
      res.sendStatus('500')
      return
    }

    rosterInfoList.forEach(player => {
      bulk.find({
        rosterId: player.rosterId
      }).upsert().replaceOne({
        ...player
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

  const bulk = mongoService.db(leagueId).collection('players').initializeUnorderedBulkOp()

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
        rosterId: player.rosterId
      }).upsert().replaceOne({
        ...player
      })
    });

    await bulk.execute();
    res.sendStatus(200);
  });
});

app.listen(app.get('port'), () =>
  console.log('Madden Data is running on port', app.get('port'))
);