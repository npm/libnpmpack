'use strict'

const t = require('tap')
const fs = require('fs')
const util = require('util')
const ssri = require('ssri')

const pack = require('../index.js')
const tnock = require('./fixtures/tnock.js')

const rimraf = util.promisify(require('rimraf'))

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

  const cwd = process.cwd()
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
    entryCount: 2,
    bundled: []
  }

  t.deepEqual(tarContents, contents,
    'packed directory matches expectations'
  )

  t.teardown(async () => {
    process.chdir(cwd)
    await rimraf(target)
    await rimraf(testDir)
  })
})

t.test('packs from local directory on target', async t => {
  const testDir = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-cool-pkg',
      version: '1.0.0',
      bundledDependencies: ['a']
    }, null, 2),
    'index.js': 'hello',
    node_modules: {
      a: {
        'package.json': JSON.stringify({
          name: 'a',
          version: '1.0.0'
        }, null, 2)
      }
    }
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
    size: 260,
    unpackedSize: 133,
    shasum: '535bdcc05fd4a1b7f2603c5527a7c63ba5b88cff',
    integrity: ssri.parse(integrity.sha512[0]),
    filename: 'my-cool-pkg-1.0.0.tgz',
    files: [
      { path: 'index.js', size: 5, mode: 420 },
      { path: 'node_modules/a/package.json', size: 39, mode: 420 },
      { path: 'package.json', size: 89, mode: 420 }
    ],
    entryCount: 3,
    bundled: ['a']
  }

  t.deepEqual(tarContents, contents,
    'packed directory matches expectations'
  )

  t.teardown(async () => {
    await rimraf(target)
    await rimraf(testDir)
  })
})

t.test('packs from registry spec', async t => {
  const spec = 'my-cool-pkg'
  const testDir = t.testdir()
  const target = `${testDir}/my-cool-pkg-1.0.0.tgz`

  const integrity = ssri.fromData('', { algorithms: ['sha512'] })
  const packument = {
    _id: 'my-cool-pkg',
    name: 'my-cool-pkg',
    description: 'some stuff',
    'dist-tags': {
      latest: '1.0.0'
    },
    versions: {
      '1.0.0': {
        _nodeVersion: process.versions.node,
        name: 'my-cool-pkg',
        version: '1.0.0',
        description: 'some stuff',
        dist: {
          shasum: 'some-shasum',
          integrity: '123',
          tarball: 'https://mock.reg/my-cool-pkg/-/my-cool-pkg-1.0.0.tgz'
        }
      }
    },
    readme: '',
    access: 'public',
    _attachments: {
      'my-cool-pkg-1.0.0.tgz': {
        content_type: 'application/octet-stream',
        data: '',
        length: '0'
      }
    }
  }

  const srv = tnock(t, REG)
  srv.get('/my-cool-pkg').reply(200, packument)
  srv.get('/my-cool-pkg/-/my-cool-pkg-1.0.0.tgz').reply(200, '')

  const tarContents = await pack(spec, { ...OPTS, target })
  const contents = {
    id: 'my-cool-pkg@1.0.0',
    name: 'my-cool-pkg',
    version: '1.0.0',
    size: 0,
    unpackedSize: 0,
    shasum: 'da39a3ee5e6b4b0d3255bfef95601890afd80709',
    integrity,
    filename: 'my-cool-pkg-1.0.0.tgz',
    files: [],
    entryCount: 0,
    bundled: []
  }

  t.deepEqual(tarContents, contents,
    'packed directory matches expectations'
  )

  t.teardown(async () => {
    await rimraf(target)
    await rimraf(testDir)
  })
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
