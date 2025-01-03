module.exports = {
    "loader": "string-replace-loader",
    options: {
        search: /font-weight:\s*(normal|bold)\b/g,
        replace(match, value) {
            return `font-weight: var(--ngw-text-font-weight-${value})`;
        },
    },
};
