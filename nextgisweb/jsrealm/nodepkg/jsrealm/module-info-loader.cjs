const config = require("./config.cjs");

module.exports = function moduleInfoLoader(source) {
  const component = config.pathToComponent(this.context);
  const moduleName = config.pathToModule(this.resourcePath, true);

  return [
    `const COMP_ID = ${JSON.stringify(component)};`,
    `const MODULE_NAME = ${JSON.stringify(moduleName)};`,
    source,
  ].join("\n");
};
