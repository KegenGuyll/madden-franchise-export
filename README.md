# Madden Companion Exporter

This app will export data from the Companion App to a firebase database.

## Installation

Click Fork (located in the top right corner of the github repository). 
After that click the green code button and then copy your url path.
```
Go to terminal.
git clone [paste your git url here]
cd Madden-Companion-Exporter
npm install
```


## Usage

To run this application locally (no real use to run locally):
```
npm run start
```

## Setup

### Create a mongodb account and database
Go here: https://mongodb.com and create an account or login.
Next, create an application.

### Create .env file copy the information below

- If you have trouble finding this information click the "connect" when viewing your db cluster
- If you plan on hosting this make sure to whitelist the server ip or it won't work

```
DB_HOST="your_db_host"
DB_PASS="your_db_pass"
DB_USER="your_db_user"
```


### Create a Heroku project
Go here: https://dashboard.heroku.com/ and create an account or login.
Next, create an application.
Then, click on the new application and go to the Deploy tab.
Under deployment method, connect to your github repo of this project.
Then go ahead and do a manual deploy.
Lastly, figure out the url to your app.

### Go to the Companion App
Go to the league's export page you want. Enter in the url of your heroku app in the following format. herokuurl.herokuapp.com/yourusername
Dont forget your username. It needs a username to match up with the app.post routes. 
The data will then be in your firebase database to do as you wish.
Either download it or use the firebase database to power your website.


## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request
