define([
    "@nextgisweb/pyramid/api",
    "@nextgisweb/pyramid/settings!",
    "@nextgisweb/pyramid/i18n!",
    // css
    "xstyle/css!./company-logo.css"
], function (
    api,
    settings,
    i18n
) {
    return function (mapNode) {
        if (settings.company_logo.enabled) {
            var anchor = document.createElement('a');
            anchor.className = 'map-logo';

            var image = document.createElement('img');
            image.src = api.routeURL('pyramid.company_logo');

            if (settings.company_logo.link !== null && settings.company_logo.link.trim() !== '') {
                anchor.href = settings.company_logo.link;
                anchor.target = '_blank';
                if (settings.company_logo.link.search(/:\/\/nextgis/) !== -1) {
                    image.alt = i18n.gettext('Get your own Web GIS at nextgis.com');
                }
            }

            anchor.appendChild(image);
            mapNode.appendChild(anchor);
        }
    }
});
