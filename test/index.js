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

t.test('files packed are alphabetically sorted', async (t) => {
  const testDir = t.testdir({
    index: 'index',
    dist: {
      'foo.js': 'foo',
      'foo.ts': 'foo',
      bar: 'bar',
      baz: 'baz'
    },
    numbers: {
      1: '1',
      11: '1',
      '01': '0',
      20: '2',
      2: '2',
      10: '1',
      0: '0'
    },
    'package.json': JSON.stringify({
      name: 'pkg'
    }),
    lib: {
      'index.js': 'lib/index',
      'foo.js': 'lib/foo'
    },
    'README.md': 'readme-1',
    'readme.txt': 'readme-2'
  })

  const target = `${testDir}/my-cool-pkg-1.0.0.tgz`
  const tarContents = await pack(testDir, { target })
  const tarFilePaths = tarContents.files.map(file => file.path)
  const expectedOrder = [
    'README.md',
    'dist/bar',
    'dist/baz',
    'dist/foo.js',
    'dist/foo.ts',
    'index',
    'lib/foo.js',
    'lib/index.js',
    'numbers/0',
    'numbers/01',
    'numbers/1',
    'numbers/2',
    'numbers/10',
    'numbers/11',
    'numbers/20',
    'package.json',
    'readme.txt'
  ]

  t.deepEqual(tarFilePaths, expectedOrder,
    'files packed matches order expectations'
  )
})
