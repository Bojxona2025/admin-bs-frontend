// Browser-safe process shim.
// This file intentionally avoids Node-only modules (e.g. child_process, fs).
const processShim =
  typeof globalThis !== "undefined" && globalThis.process
    ? globalThis.process
    : { env: {} };

module.exports = processShim;
module.exports.default = processShim;
