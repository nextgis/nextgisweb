/** Converts NextGIS-specific URL into a regular URL
 *
 * Replaces the {lang} placeholder with the current language. Links which don't
 * start from "docs:path" will be converted to redirects like the following:
 * "https://nextgis.com/redirect/docs/{lang}/path".*/
export function url(source: string): string {
    const [proto, rest] = source.split(":", 2);
    if (/^https?$|^\//.test(proto)) return source.replace("{lang}", ngwConfig.locale);
    return `https://nextgis.com/redirect/${proto}/${ngwConfig.locale}/${rest}`;
}
