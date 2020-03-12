define([
    "dojo/request/xhr",
    "ngw/route",
    "ngw-pyramid/i18n!pyramid",
    // css
    "xstyle/css!./MapLogo.css"
], function (
    xhr,
    route,
    i18n
) {
    return function (mapNode) {
        function createMapLogo (map_logo_data) {
            var anchor = document.createElement('a');
            anchor.className = 'map-logo';
            anchor.href = 'https://nextgis.com';
            anchor.target = '_blank';
    
            var image = document.createElement('img');
            image.src = 'data:image/png;base64,' + map_logo_data;
            image.alt = i18n.gettext('Get your own Web GIS at nextgis.com');
    
            anchor.appendChild(image);

            return anchor;
        }

        var MAP_LOGO_URL = route.pyramid.map_logo();

        xhr.get(MAP_LOGO_URL, {
            handleAs: 'json'
        }).then(function (data) {
            var map_logo_data = data.map_logo;
            if (map_logo_data !== null) {
                mapNode.appendChild(createMapLogo(map_logo_data));
                console.log(mapNode)
            }
        });
    }
});
