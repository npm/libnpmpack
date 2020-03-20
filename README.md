# libnpmpack

[![npm version](https://img.shields.io/npm/v/libnpmpack.svg)](https://npm.im/libnpmpack)
[![license](https://img.shields.io/npm/l/libnpmpack.svg)](https://npm.im/libnpmpack)
[![GitHub Actions](https://github.com/npm/libnpmpack/workflows/Node%20CI/badge.svg)](https://github.com/npm/libnpmpack/actions?query=workflow%3A%22Node+CI%22)
[![Coverage Status](https://coveralls.io/repos/github/npm/libnpmpack/badge.svg?branch=latest)](https://coveralls.io/github/npm/libnpmpack?branch=latest)

[`libnpmpack`](https://github.com/npm/libnpmpack) is a Node.js library for
programmatically packing tarballs from a local directory or from a registry or github spec. If packing from a local source, `libnpmpack` will also run the `prepack` and `postpack` lifecycles.

## Table of Contents

* [Example](#example)
* [Install](#install)
* [API](#api)
  * [`pack()`](#pack)

## Example

```js
const pack = require('libnpmpack')
```

## Install

`$ npm install libnpmpack`

### API


#### <a name="pack"></a> `> pack(spec, [opts]) -> Promise`

Packs a tarball from a local directory or from a registry or github spec and saves it on disk. Returns a Promise that resolves to an object containing the tarball contents.

If no options are passed, the tarball file will be saved on the same directory from which `pack` was called in.
 
If `opts.target` is passed in, it will save the tarball file on the location entered.

`libnpmpack` uses [`pacote`](https://npm.im/pacote).
Most options are passed through directly to that library, so please refer to
[its own `opts`
documentation](https://www.npmjs.com/package/pacote#options)
for options that can be passed in.

##### Examples

```javascript
// packs from local directory
const localTar = await pack()
console.log(localTar)
/* 
{
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
*/

// packs from a registry spec
const registryTar = await pack('abbrev@1.0.3')
console.log(registryTar)
/*
{
  id: abbrev@1.0.3,
  name: 'abbrev',
  version: '1.0.3',
  size: 1526,
  unpackedSize: 3358,
  shasum: 'aa049c967f999222aa42e14434f0c562ef468241',
  integrity: Integrity { sha512: [ [Hash] ] },
  filename: 'abbrev-1.0.3.tgz',
  files: [
    { path: 'package.json', size: 277, mode: 420 },
    { path: 'README.md', size: 499, mode: 420 },
    { path: 'lib/abbrev.js', size: 2582, mode: 420 }
  ],
  entryCount: 3,
  bundled: []
}
*/

// packs from a github spec
const githubTar = await pack('isaacs/rimraf#PR-192')
/*
{
  id: 'rimraf@2.6.3',
  name: 'rimraf',
  version: '2.6.3',
  size: 5664,
  unpackedSize: 15463,
  shasum: '9f5edf99046b4096d610532f0ec279135a624b15',
  integrity: Integrity { sha512: [ [Hash] ] },
  filename: 'rimraf-2.6.3.tgz',
  files: [
    { path: 'LICENSE', size: 765, mode: 420 },
    { path: 'bin.js', size: 1196, mode: 493 },
    { path: 'rimraf.js', size: 9225, mode: 420 },
    { path: 'package.json', size: 677, mode: 420 },
    { path: 'README.md', size: 3600, mode: 420 }
  ],
  entryCount: 5,
  bundled: []
}
*/
```

