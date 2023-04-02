
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

  Object.keys(curr).forEach((key) => {
    if(Array.isArray(curr[key])){
      // latest version of element

      let firstElement = curr[key]

      // to prevent same value but different version
      if(isObject(firstElement)) {
        firstElement = Object.values(firstElement)[0]
      }

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