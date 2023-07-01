import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import nodePolyfills from "rollup-plugin-polyfill-node";
import serve from "rollup-plugin-serve";

import pkg from "./package.json";

export default [
  {
    input: "src/mopidy.ts",
    external: ["modern-isomorphic-ws"],
    output: {
      name: "Mopidy",
      file: pkg.browser,
      format: "umd",
      globals: {
        "modern-isomorphic-ws": "WebSocket",
      },
    },
    plugins: [
      typescript(),
      resolve(), // Find dependencies in node_modules
      nodePolyfills(), // Polyfill Node.js modules for the browser
      serve({
        contentBase: ["examples/web/", "dist"], // Serve web client example and built files
        host: "localhost",
        port: 1234,
      }),
    ],
  },
  {
    input: "src/mopidy.ts",
    external: ["modern-isomorphic-ws", "events"],
    output: [
      {
        file: pkg.main,
        format: "cjs",
      },
      {
        file: pkg.module,
        format: "es",
      },
    ],
    plugins: [typescript()],
  },
];
