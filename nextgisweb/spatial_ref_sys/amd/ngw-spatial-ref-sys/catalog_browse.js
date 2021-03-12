define([
    "dojo/request/xhr",
    "ngw/route",
    "ngw-pyramid/ErrorDialog/ErrorDialog",
    "ngw-pyramid/i18n!spatial_ref_sys",
], function (
    xhr,
    route,
    ErrorDialog,
    i18n,
) {
    var error_message = document.getElementById("error-message");
    function set_error (message) {
        if (message === null) {
            error_message.style.display = "none";
        } else {
            error_message.innerHTML = message;
            error_message.style.display = "";
        }
    }

    var search_form = document.getElementById("search-form");
    var text_filter = document.getElementById("text-filter");
    var lat_filter = document.getElementById("lat-filter");
    var lon_filter = document.getElementById("lon-filter");

    var table = document.getElementById('catalog-table');
    var table_body = table.getElementsByTagName('tbody')[0];

    function clear_table () {
        table_body.innerHTML = "";
    }

    var searching = false;

    search_form.onsubmit = function (event) {
        event.preventDefault();

        if (searching) {
            return;
        } else {
            searching = true;
        }

        set_error(null);

        clear_table();

        var query = { q: text_filter.value };

        var lat = parseFloat(lat_filter.value);
        var lon = parseFloat(lon_filter.value);
        if (isFinite(lat) ^ isFinite(lon)) {
            return set_error(i18n.gettext("Longitude and latitude must be specified at the same time."));
        } else if (isFinite(lat)) {
            query.lat = lat;
            query.lon = lon;
        }

        var properties = ['display_name', 'auth_name', 'auth_srid'];
        xhr.get(route.spatial_ref_sys.catalog.collection(), {
            handleAs: "json",
            headers: { "Accept": "application/json" },
            query: query
        }).then(function (data) {
            for (var i = 0; i < data.length; i++) {
                var item = data[i];

                var row = table_body.insertRow();

                properties.forEach(function (property) {
                    var cell = row.insertCell();
                    var value = item[property];
                    if (value !== undefined) {
                        cell.innerHTML = value;
                    }
                });

                var importLink = document.createElement('a');
                importLink.setAttribute("class", "material-icons icon-viewMap");
                importLink.setAttribute("target", "_blank");
                importLink.setAttribute("href", route.srs.catalog.import({id: item['id']}));
                importLink.setAttribute("title", i18n.gettext("View"))
                row.insertCell().appendChild(importLink);
            }

            searching = false;
        }, function (error) {
            ErrorDialog.xhrError(error);
            searching = false;
        });
    }
});
