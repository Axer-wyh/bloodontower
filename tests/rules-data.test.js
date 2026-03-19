const test = require("node:test");
const assert = require("node:assert/strict");

const { troubleBrewing } = require("../packages/rules-data/src");

test("Trouble Brewing has full core role set", function () {
  assert.equal(troubleBrewing.roles.length, 22);
  assert.equal(troubleBrewing.name, "暗流涌动");
  assert.equal(troubleBrewing.seatDistributions["15"].demons, 1);
});

test("every role keeps official-source link and icon key", function () {
  troubleBrewing.roles.forEach(function eachRole(role) {
    assert.match(role.sourceLink, /^https:\/\/clocktower-wiki\.gstonegames\.com\/index\.php\?search=/);
    assert.ok(role.roleIconKey);
    assert.ok(role.iconFallbackText);
  });
});

