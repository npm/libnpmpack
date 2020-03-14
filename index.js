'use strict'

const os = require('os')
const fs = require('fs')
const path = require('path')
const util = require('util')
const pacote = require('pacote')
const npa = require('npm-package-arg')

const runScript = require('@npmcli/run-script')

const mkdtemp = util.promisify(fs.mkdtemp)
const rimraf = util.promisify(require('rimraf'))

const mv = require('./utils/mv')
const { getContents, logTar } = require('./utils/tar')

async function pack (spec = 'file:.', opts = {}) {
  const { target = null } = opts
  // gets spec
  spec = npa(spec)

  const manifest = await pacote.manifest(spec, opts)
  const filename = path.basename(`${manifest.name}-${manifest.version}.tgz`)
  const dest = target || `${process.cwd()}/${filename}`

  if (spec.type === 'directory') {
    // prepack
    await runScript({
      ...opts,
      event: 'prepack',
      path: spec.fetchSpec,
      stdio: 'inherit',
      pkg: manifest,
      env: {
        npm_package_target: dest
      }
    })
  }

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'libnpmpack-'))
  const tmpTarget = `${tmpDir}/${filename}`

  // packs tarball on tmp location
  const tarball = await pacote.tarball.file(manifest._resolved, tmpTarget, {
    ...opts,
    integrity: manifest._integrity
  })

  // moves tarball to dest
  await mv(tmpTarget, dest)
  rimraf(tmpDir)

  if (spec.type === 'directory') {
    // postpack
    await runScript({
      ...opts,
      event: 'postpack',
      path: spec.fetchSpec,
      stdio: 'inherit',
      pkg: manifest,
      env: {
        npm_package_target: dest,
        npm_package_from: tarball.from,
        npm_package_resolved: tarball.resolved,
        npm_package_integrity: tarball.integrity
      }
    })
  }

  const contents = await getContents(manifest, dest)
  return contents
}

pack.logTar = logTar
module.exports = pack
