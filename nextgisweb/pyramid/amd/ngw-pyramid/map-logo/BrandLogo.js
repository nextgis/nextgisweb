define([
    "dojo/request/xhr",
    "ngw/route",
    "ngw/settings!pyramid",
    "ngw-pyramid/i18n!pyramid",
    // css
    "xstyle/css!./BrandLogo.css"
], function (
    xhr,
    route,
    settings,
    i18n
) {
    return function (mapNode) {
        if (settings.brand_logo.enabled) {
            var anchor = document.createElement('a');
            anchor.className = 'map-logo';
            anchor.href = 'https://nextgis.com';
            anchor.target = '_blank';

            var image = document.createElement('img');
            image.src = route.pyramid.brand_logo();
            image.alt = i18n.gettext('Get your own Web GIS at nextgis.com');

            anchor.appendChild(image);
            mapNode.appendChild(anchor);
        }
    }
});
