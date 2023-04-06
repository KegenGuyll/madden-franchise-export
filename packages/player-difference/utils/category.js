const { numberDiff } = require('./common')

const categories = {
    'contract': {
      "positive": [],
      "negative": []
    },
    'personal': {
      "positive": [],
      "negative": []
    },
    'team': {
      "positive": [
        "looks like a good fit"
      ],
      "neutral": [
        'was traded'
      ],
      "negative": [
        "wasn't good enough"
      ]
    },
    "agility": {
      "positive": [],
      "negative": [ "did nothing"]
    },
    "strength": {
      "positive": [
        "did some Pull-ups",
        "did some Push-ups",
        "did some Glute Bridges",
        "did some Squats",
        "played well"
      ],
      "negative": [
        "did nothing"
      ]
    },
    "conditioning": {
      "positive": [
        "read can't hurt me",
        "re-read can't hurt for the 7th time",
        "played well"
      ],
      "negative": [
        "took on the Eddie Lacy diet",
      ]
    },
    "throwing": {
      "positive": [
        'threw some balls with some local highschool kids',
        "played well"
      ],
      "negative": [
        'had a night out with Jameis Winston'
      ]
    },
    "routeRunning": {
      "positive": [
        'watched some Chad Johnson highlights',
        "played well"
      ],
      "negative": [
        'watched some Alshon Jeffery highlights'
      ]
    },
    "blocking": {
      "positive": [
        'trained with the Rock',
        'tried a little bit harder today',
        "played wll"
      ],
      "negative": [
        "is getting old",
        "threw his back out",
        "got divorced and she took the kids"
      ]
    },
    "film": {
        "positive": [
            'spent an extra hour watching film',
            'took some Adderall to watch film longer',
            "played well"
        ],
        "negative": [
            'fell a sleep watching film',
            'new season of Warzone dropped',
            "played wll"
        ]
    },
    "stats": {
      "positive": [ "played well"],
      "negative": [ "did nothing"]
    },
    "trait": {
      "positive": [ "played well"],
      "negative": [ "did nothing"]
    },
    "injury": {
      "positive": [],
      "negative": []
    },
}


const matchCategories = (category, result, diff) => {
    let response = ''

    Object.keys(categories).forEach((c) => {
      if(c === 'team' && category === 'team'){
        console.log(c, result)
        const random = Math.floor(Math.random() * categories[c][result].length)

        let context = ''

        if(result === 'positive') {
          context = 'was signed'
        } else if (result === 'negative') {
          context = 'was released'
        } else {
          context = 'detached'
        }

        response = `${categories[c][result][random]} and ${context}`

      }else if(category === c) {
        console.log(categories[c], categories[c][result])
        const random = Math.floor(Math.random() * categories[c][result].length)

        let context = result === 'positive' ? 'progressed' : 'regressed'

        response =`${categories[c][result][random]} and ${context} by ${diff.toString().replace('-', '')}`
      }
    })

    return response
}

const diffResponse = (oldData, newData, key) => {
  const diff = numberDiff(oldData, newData)
  const positive = 'positive'
  const negative = 'negative'
  const neutral = 'neutral'

  if(key === 'teamId') {
    if(newData === 0) return negative

    if(oldData === 0) return positive

    return neutral
  }

  if(key === 'isOnPracticeSquad') {
    return neutral
  }

  if(key === 'isFreeAgent') {
    if(newData === true) return negative
    return positive
  }

  if(key === 'position') return neutral

  if(key === 'jerseyNum') return neutral

  if(diff > 0) {
    return negative
  } else {
    return positive
  }
}

module.exports = {
  matchCategories,
  diffResponse
}