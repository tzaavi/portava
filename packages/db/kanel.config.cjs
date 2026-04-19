const { makePgTsGenerator } = require("kanel")
const { makeKyselyHook } = require("kanel-kysely")

/** @type {import('kanel').ConfigV4} */
module.exports = {
  connection: "postgresql://portava:portava@localhost:5433/portava",
  outputPath: "./src/generated",
  generators: [
    makePgTsGenerator({
      preRenderHooks: [makeKyselyHook()],
    }),
  ],
}
