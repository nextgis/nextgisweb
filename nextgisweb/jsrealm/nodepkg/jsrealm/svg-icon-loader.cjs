const path = require("path");

function contextifyFilename(loaderContext, filename) {
  const contextify = loaderContext.utils?.contextify;
  if (contextify) return contextify(loaderContext.context, filename);

  const relative = path
    .relative(loaderContext.context, filename)
    .replaceAll("\\", "/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}

function stringifyRequest(loaderContext, request) {
  const value = request
    .split("!")
    .map((item) => {
      if (!item) return item;

      const queryIndex = item.indexOf("?");
      const filename = queryIndex === -1 ? item : item.slice(0, queryIndex);
      const query = queryIndex === -1 ? "" : item.slice(queryIndex);

      return path.isAbsolute(filename)
        ? contextifyFilename(loaderContext, filename) + query
        : item.replaceAll("\\", "/");
    })
    .join("!");

  return JSON.stringify(value);
}

module.exports.pitch = function svgIconLoader(remainingRequest) {
  const symbolRequest = stringifyRequest(this, `!!${remainingRequest}`);

  return `
        import { createElement } from "react";
        import symbol from ${symbolRequest};

        function Icon({...props}) {
            return createElement(
                "svg",
                { ...props, className: "icon", fill: "currentColor" },
                createElement("use", { xlinkHref: symbol.url })
            );
        };

        Icon.id = symbol.id;

        export default Icon;
    `;
};
