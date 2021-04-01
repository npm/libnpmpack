'use strict'

const nock = require('nock')
nock.disableNetConnect()

module.exports = tnock
function tnock (t, host) {
  const server = nock(host)
  t.tearDown(function () {
    server.done()
  })
  return server
}
