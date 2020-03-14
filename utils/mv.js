const fs = require('fs')
const util = require('util')
const rename = util.promisify(fs.rename)
const unlink = util.promisify(fs.unlink)

module.exports = move
async function move (oldPath, newPath) {
  try {
    return await rename(oldPath, newPath)
  } catch (e) {
    /* istanbul ignore next */
    if (e.code === 'EXDEV') {
      return copy(oldPath, newPath)
    } else {
      throw e
    }
  }
}

/* istanbul ignore next */
function copy (oldPath, newPath) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(oldPath)
    const writeStream = fs.createWriteStream(newPath)

    readStream.on('error', (e) => { reject(e) })
    writeStream.on('error', (e) => { reject(e) })

    readStream.on('close', function () {
      resolve(unlink(oldPath))
    })

    readStream.pipe(writeStream)
  })
}
