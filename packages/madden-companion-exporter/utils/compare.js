
const isDiff = (a, b) => {
  if (String(a) === String(b)) {
    return false
  }

  return true
}

function isObject(objValue) {
  return objValue && typeof objValue === 'object' && objValue.constructor === Object;
}

const compareObject = (curr, update, leagueId) => {
  const diffs = []
  const date = new Date()

  if(curr._id) delete curr._id
  if(update._id) delete update._id

  Object.keys(curr).forEach((key) => {
    if(isDiff(curr[key], update[key])){
      diffs.push({
        newData: update[key],
        oldData: curr[key],
        date,
        leagueId,
        key,
        rosterId: curr.rosterId
      })
    }
  })


    
  return diffs
}

module.exports = {compareObject}