'use strict'

const t = require('tap')
const fs = require('fs')
const ssri = require('ssri')
const pacote = require('pacote')
const pack = require('../index.js')
const tnock = require('./fixtures/tnock.js')

const OPTS = {
  registry: 'https://mock.reg/'
}

const REG = OPTS.registry

t.test('packs from local directory', async t => {
  const testDir = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-cool-pkg',
      version: '1.0.0'
    }, null, 2),
    'index.js': 'hello'
  })
  const target = `${testDir}/my-cool-pkg-1.0.0.tgz`

  process.chdir(testDir)
  const tarContents = await pack()
  const integrity = await ssri.fromStream(fs.createReadStream(target), {
    algorithms: ['sha512']
  })

  const contents = {
    id: 'my-cool-pkg@1.0.0',
    name: 'my-cool-pkg',
    version: '1.0.0',
    size: 187,
    unpackedSize: 54,
    shasum: 'e4db5fa79b694e5f94cb7a48250eb5a728f9669f',
    integrity: ssri.parse(integrity.sha512[0]),
    filename: 'my-cool-pkg-1.0.0.tgz',
    files: [
      { path: 'index.js', size: 5, mode: 420 },
      { path: 'package.json', size: 49, mode: 420 }
    ],
    entryCount: 2
    // bundled: []
  }

  t.deepEqual(tarContents, contents,
    'packed directory matches expectations'
  )
})

t.test('packs from local directory on target', async t => {
  const testDir = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-cool-pkg',
      version: '1.0.0'
    }, null, 2),
    'index.js': 'hello'
  })
  const target = `${testDir}/my-cool-pkg-1.0.0.tgz`

  const tarContents = await pack(testDir, { target })
  const integrity = await ssri.fromStream(fs.createReadStream(target), {
    algorithms: ['sha512']
  })

  const contents = {
    id: 'my-cool-pkg@1.0.0',
    name: 'my-cool-pkg',
    version: '1.0.0',
    size: 187,
    unpackedSize: 54,
    shasum: 'e4db5fa79b694e5f94cb7a48250eb5a728f9669f',
    integrity: ssri.parse(integrity.sha512[0]),
    filename: 'my-cool-pkg-1.0.0.tgz',
    files: [
      { path: 'index.js', size: 5, mode: 420 },
      { path: 'package.json', size: 49, mode: 420 }
    ],
    entryCount: 2
    // bundled: []
  }

  t.deepEqual(tarContents, contents,
    'packed directory matches expectations'
  )
})

t.test('packs from registry spec', async t => {
  const testDir = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-cool-pkg',
      version: '1.0.0'
    }, null, 2),
    'index.js': 'hello'
  })
  const target = `${testDir}/my-cool-pkg-1.0.0.tgz`
  const spec = 'my-cool-pkg'

  const tarData = await pacote.tarball(`file:${testDir}`)
  const integrity = ssri.fromData(tarData, { algorithms: ['sha512'] })
  const packument = {
    _id: 'my-cool-pkg',
    name: 'my-cool-pkg',
    description: 'some stuff',
    'dist-tags': {
      latest: '1.0.0'
    },
    versions: {
      '1.0.0': {
        _id: 'my-cool-pkg@1.0.0',
        _nodeVersion: process.versions.node,
        name: 'my-cool-pkg',
        version: '1.0.0',
        description: 'some stuff',
        dist: {
          shasum: 'some-shasum',
          integrity: integrity.toString(),
          tarball: testDir
        }
      }
    },
    readme: '',
    access: 'public',
    _attachments: {
      'my-cool-pkg-1.0.0.tgz': {
        content_type: 'application/octet-stream',
        data: tarData.toString('base64'),
        length: tarData.length
      }
    }
  }

  const srv = tnock(t, REG)
  srv.get('/my-cool-pkg').reply(200, packument)

  const tarContents = await pack(spec, { ...OPTS, target })
  const contents = {
    id: 'my-cool-pkg@1.0.0',
    name: 'my-cool-pkg',
    version: '1.0.0',
    size: 187,
    unpackedSize: 54,
    shasum: 'e4db5fa79b694e5f94cb7a48250eb5a728f9669f',
    integrity,
    filename: 'my-cool-pkg-1.0.0.tgz',
    files: [
      { path: 'index.js', size: 5, mode: 420 },
      { path: 'package.json', size: 49, mode: 420 }
    ],
    entryCount: 2
    // bundled: []
  }

  t.deepEqual(tarContents, contents,
    'packed directory matches expectations'
  )
})
