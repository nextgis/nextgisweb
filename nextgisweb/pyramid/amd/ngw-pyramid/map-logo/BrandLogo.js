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

            var image = document.createElement('img');
            image.src = route.pyramid.brand_logo();

            if (settings.brand_logo.link.trim() !== '') {
                anchor.href = settings.brand_logo.link;
                anchor.target = '_blank';
                if (settings.brand_logo.link.search(/:\/\/nextgis/) !== -1) {
                    image.alt = i18n.gettext('Get your own Web GIS at nextgis.com');
                }
            }

            anchor.appendChild(image);
            mapNode.appendChild(anchor);
        }
    }
});
