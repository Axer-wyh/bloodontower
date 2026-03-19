function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeId(prefix) {
  return prefix + "-" + Math.random().toString(36).slice(2, 8);
}

function shuffle(list, rng) {
  const next = list.slice();
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const current = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = current;
  }
  return next;
}

function sample(list, count, rng) {
  if (count > list.length) {
    throw new Error("Cannot sample more items than available.");
  }
  return shuffle(list, rng).slice(0, count);
}

function indexBy(list, key) {
  return list.reduce(function reducer(accumulator, item) {
    accumulator[item[key]] = item;
    return accumulator;
  }, {});
}

function countAdjacentPairs(players, predicate) {
  let total = 0;
  for (let index = 0; index < players.length; index += 1) {
    const current = players[index];
    const next = players[(index + 1) % players.length];
    if (predicate(current) && predicate(next)) {
      total += 1;
    }
  }
  return total;
}

function getNeighbors(players, playerId) {
  const index = players.findIndex(function findPlayer(player) {
    return player.playerId === playerId;
  });

  if (index === -1) {
    throw new Error("Unknown player for neighbor lookup.");
  }

  const left = players[(index - 1 + players.length) % players.length];
  const right = players[(index + 1) % players.length];
  return [left, right];
}

module.exports = {
  cloneDeep,
  makeId,
  shuffle,
  sample,
  indexBy,
  countAdjacentPairs,
  getNeighbors,
};

