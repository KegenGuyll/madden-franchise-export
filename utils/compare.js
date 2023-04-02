
const isDiff = (a, b) => {
  if (a.toString() === b.toString()) {
    return false
  }

  return true
}


const compareObject = (curr, update) => {
  const newObject = {}

  Object.keys(curr).forEach((key) => {
    if(Array.isArray(curr[key])){
      // latest version of element
      const firstElement = curr[key]

      if(isDiff(firstElement, update[key])){
        newObject[key] = [
          {
            [key]: update[key],
            version: curr[key].length + 1
          },
          ...curr[key]
        ]
      }
    } else {
      if(isDiff(curr[key], update[key])){
        newObject[key] = [
          {
            [key]: update[key],
            version: 2
          },
          {
            [key]: curr[key],
            version: 1
          }
        ]
      } else {
        newObject[key] = curr[key]
      }
    }
  })

  return newObject
}

module.exports = {compareObject}