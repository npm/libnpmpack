'use strict'

const fs = require('fs')
const tar = require('tar')
const util = require('util')
const ssri = require('ssri')
const byteSize = require('byte-size')
const columnify = require('columnify')

const statAsync = util.promisify(require('fs').stat)

module.exports.logTar = logTar
// istanbul ignore next
function logTar (tarball, opts = {}) {
  const { unicode, log = console.log } = opts
  log('')
  log('', `${unicode ? '📦 ' : 'package:'} ${tarball.name}@${tarball.version}`)
  log('=== Tarball Contents ===')
  if (tarball.files.length) {
    log('', columnify(tarball.files.map((f) => {
      const bytes = byteSize(f.size)
      return { path: f.path, size: `${bytes.value}${bytes.unit}` }
    }), {
      include: ['size', 'path'],
      showHeaders: false
    }))
  }
  if (tarball.bundled.length) {
    log('=== Bundled Dependencies ===')
    tarball.bundled.forEach((name) => log.notice('', name))
  }
  log('=== Tarball Details ===')
  log('', columnify([
    { name: 'name:', value: tarball.name },
    { name: 'version:', value: tarball.version },
    tarball.filename && { name: 'filename:', value: tarball.filename },
    { name: 'package size:', value: byteSize(tarball.size) },
    { name: 'unpacked size:', value: byteSize(tarball.unpackedSize) },
    { name: 'shasum:', value: tarball.shasum },
    {
      name: 'integrity:',
      value: tarball.integrity.toString().substr(0, 20) + '[...]' + tarball.integrity.toString().substr(80)
    },
    tarball.bundled.length && { name: 'bundled deps:', value: tarball.bundled.length },
    tarball.bundled.length && { name: 'bundled files:', value: tarball.entryCount - tarball.files.length },
    tarball.bundled.length && { name: 'own files:', value: tarball.files.length },
    { name: 'total files:', value: tarball.entryCount }
  ].filter((x) => x), {
    include: ['name', 'value'],
    showHeaders: false
  }))
  log('', '')
}

module.exports.getContents = getContents
async function getContents (manifest, target) {
  // const bundledWanted = new Set(
  //   manifest.bundleDependencies ||
  //   manifest.bundledDependencies ||
  //   []
  // )
  const files = []
  // const bundled = new Set()
  let totalEntries = 0
  let totalEntrySize = 0

  // reads contents of tarball
  await tar.t({
    file: target,
    onentry (entry) {
      totalEntries++
      totalEntrySize += entry.size
      // const p = entry.path
      // if (p.startsWith('package/node_modules/')) {
      //   const name = p.match(/^package\/node_modules\/((?:@[^/]+\/)?[^/]+)/)[1]
      //   if (bundledWanted.has(name)) {
      //     bundled.add(name)
      //   }
      // }
      files.push({
        path: entry.path.replace(/^package\//, ''),
        size: entry.size,
        mode: entry.mode
      })
    },
    strip: 1
  })

  const [stat, integrity] = await Promise.all([
    statAsync(target),
    ssri.fromStream(fs.createReadStream(target), {
      algorithms: ['sha1', 'sha512']
    })
  ])

  const shasum = integrity.sha1[0].hexDigest()
  return {
    id: manifest._id,
    name: manifest.name,
    version: manifest.version,
    size: stat.size,
    unpackedSize: totalEntrySize,
    shasum,
    integrity: ssri.parse(integrity.sha512[0]),
    filename: `${manifest.name}-${manifest.version}.tgz`,
    files,
    entryCount: totalEntries
    // bundled: Array.from(bundled)
  }
}
