define([
    "@nextgisweb/pyramid/api",
    "@nextgisweb/pyramid/settings!",
    "@nextgisweb/pyramid/i18n!",
    // css
    "xstyle/css!./company-logo.css"
], function (
    api,
    settingsPyramid,
    i18n
) {
    return function (mapNode) {
        var settings = settingsPyramid.company_logo;
        if (settings.enabled) {
            var anchor = document.createElement('a');
            anchor.className = 'map-logo';

            var image = document.createElement('img');
            image.src = api.routeURL('pyramid.company_logo') + '?ckey=' + settings.ckey;

            if (settings.link !== null && settings.link.trim() !== '') {
                anchor.href = settings.link;
                anchor.target = '_blank';
                if (settings.link.search(/:\/\/nextgis/) !== -1) {
                    image.alt = i18n.gettext('Get your own Web GIS at nextgis.com');
                }
            }

            anchor.appendChild(image);
            mapNode.appendChild(anchor);
        }
    }
});
