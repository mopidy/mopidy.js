# Mopidy.js

[![Latest npm version](https://img.shields.io/npm/v/mopidy.svg?style=flat)](https://www.npmjs.org/package/mopidy)
[![Number of npm downloads](https://img.shields.io/npm/dm/mopidy.svg?style=flat)](https://www.npmjs.org/package/mopidy)
[![Build Status](https://img.shields.io/travis/mopidy/mopidy.js.svg?style=flat)](https://travis-ci.org/mopidy/mopidy.js)

Mopidy.js is a JavaScript library for controlling a Mopidy music server over a
WebSocket from the browser or from Node.js.

The library makes Mopidy's core API available from the browser and Node.js
programs, using JSON-RPC messages over a WebSocket to communicate with Mopidy.

This is the foundation of Mopidy web clients.

## Getting it for browser use

A minified versions of Mopidy.js, complete with sourcemap, is available from
the project's
[GitHub release page](https://github.com/mopidy/mopidy.js/releases).

## Getting it for Node.js use

If you want to use Mopidy.js from Node.js instead of a browser, you can install
Mopidy.js using Yarn:

```
yarn add mopidy
```

Or using npm:

```
npm install mopidy
```

After installing, you can import Mopidy.js into your code using `require()`:

```js
const Mopidy = require("mopidy");
```

Or using ES6 imports:

```js
import Mopidy from "mopidy";
```

## Using the library

See the [Mopidy.js documentation](https://docs.mopidy.com/en/latest/api/js/).

## Building from source

Install [Node.js](https://nodejs.org/) and [Yarn](https://yarnpkg.com/).

Enter the source directory, and install all dependencies:

```
yarn
```

That's it.

You can now run the tests and linters:

```
yarn test
```

To build updated JavaScript files for browser use in `dist/`, run:

```
yarn build
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
