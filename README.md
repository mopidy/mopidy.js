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

## Demo web application

![Web demo](examples/web.png)

In the `examples/` directory of the Git repo, you can find a small demo web
application using Mopidy.js. The left half of the screen shows what's
currently playing and provides some basic playback controls. The right half of
the screen shows the JSON-RPC messages and events that are sent back and forth
to the server, hopefully giving some insight into what is available to
Mopidy.js developers.

To run the demo application yourself:

1. Make sure the `http/allowed_origins` config value in your `mopidy.conf`
   includes `localhost:1234`.

2. Run Mopidy on your local machine, so that Mopidy's web interface becomes
   available at http://localhost:6680/.

3. Clone Mopidy.js from GitHub.

4. Run `yarn` to install dependencies.

5. Run `yarn start` to run the demo application at http://localhost:1234/.

This setup uses hot module reloading, so any changes you do to the demo
application files, `examples/web.{html,js}`, will instantly be visible in
your browser. Thus, this can serve as a nice playing ground to get to know
the capabilities of Mopidy and Mopidy.js.

## Demo console application

In the `examples/` directory of the Git repo, you can find `mpc.js`, a partial
clone of the `mpc` utility built using Mopidy.js on Node.

Output from the original command:

```
$ mpc
Jon Hopkins - C O S M
[playing] #6/12   2:33/7:08 (35%)
volume:100%   repeat: off   random: on    single: off   consume: off
```

Output from the `mpc.js` example:

```
$ ./examples/mpc.js
Jon Hopkins - C O S M
[playing] #6/-   2:34/7:08 (36%)
volume:100%   repeat: off   random: on    single: off   consume: off
```

To run this example yourself, follow step 1-4 for the demo web application, and
then run `./examples/mpc.js`.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
