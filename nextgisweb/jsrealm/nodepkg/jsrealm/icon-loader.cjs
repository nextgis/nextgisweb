const iconUtil = require("./icon/util.cjs");

function replaceRequests(source, resolveRequest) {
  return source
    .replace(
      /(\bimport\s+(?:(?:[^"']+?)\s+from\s+)?["'])([^"']+)(["'])/g,
      (_, prefix, request, suffix) => resolveRequest(prefix, request, suffix)
    )
    .replace(
      /(\bexport\s+[^"']+\s+from\s+["'])([^"']+)(["'])/g,
      (_, prefix, request, suffix) => resolveRequest(prefix, request, suffix)
    )
    .replace(
      /(\bimport\s*\(\s*["'])([^"']+)(["']\s*\))/g,
      (_, prefix, request, suffix) => resolveRequest(prefix, request, suffix)
    );
}

module.exports = function iconLoader(source) {
  return replaceRequests(source, (prefix, request, suffix) => {
    const resolved = iconUtil.resolveIconRequest(request, this.resourcePath);
    return `${prefix}${resolved || request}${suffix}`;
  });
};
