
const isDiff = (a, b) => {
  if (String(a) === String(b)) {
    return false
  }

  return true
}

function isObject(objValue) {
  return objValue && typeof objValue === 'object' && objValue.constructor === Object;
}

const compareObject = (curr, update) => {
  const newObject = {}
  const date = new Date()

  Object.keys(curr).forEach((key) => {
    if(Array.isArray(curr[key])){
      // latest version of element

      let firstElementCurr = curr[key]
      let firstElementUpdate = update[key]

      // to prevent same value but different version
      if(isObject(firstElementCurr)) {
        firstElementCurr = Object.values(firstElementCurr)[0][key]
      }

      if(isObject(firstElementUpdate)){
        firstElementUpdate = Object.values(firstElementUpdate)[0][key]
      }

      if(isDiff(firstElementCurr, firstElementUpdate)){
        newObject[key] = [
          {
            [key]: firstElementUpdate,
            version: curr[key].length + 1,
            date
          },
          ...curr[key]
        ]
      }
    } else {
      if(isDiff(curr[key], update[key])){
        newObject[key] = [
          {
            [key]: update[key],
            version: 2,
            date
          },
          {
            [key]: curr[key],
            version: 1,
            date
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