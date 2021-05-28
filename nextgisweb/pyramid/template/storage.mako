<%inherit file='nextgisweb:templates/base.mako' />
<%!from nextgisweb.pyramid.util import _ %>


<div class="content-box">
    <div class="table-wrapper">
        <table class="pure-table pure-table-horizontal">

            <thead><tr> 
                <th class="sort-default" style="width: 80%; text-align: inherit;">${tr(_('Kind of data'))}</th>
                <th style="width: 20em; text-align: inherit;">${tr(_('Volume'))}</th>
            </tr></thead>

            <tbody id="storage-body"></tbody>
            <tfoot id="storage-foot" style="font-size: larger;"></tfoot>
        </table>
    </div>
</div>

<script>
require([
    "dojo/number",
    "dojo/request/xhr",
    "ngw/route",
    "@nextgisweb/pyramid/i18n!",
], function (
    number,
    xhr,
    route,
    i18n,
) {
    function formatBytes(bytes) {
        var units = ["B", "KB", "MB", "GB"];
        var i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length-1);
        var value = bytes / 1024**i;
        var places = i < 3 ? 0 : 2;
        return number.format(value, {places: places, locale: dojoConfig.locale}) + " " + units[i];
    }

    xhr.get(route.pyramid.storage(), {
        handleAs: "json"
    }).then(function (data) {
        var body = document.getElementById("storage-body");
        var foot = document.getElementById("storage-foot");

        function add_row (parent, kind_of_data, volume) {
            var row = parent.insertRow();
            row.insertCell().innerText = kind_of_data;
            volume_pretty = formatBytes(volume);
            row.insertCell().innerText = volume_pretty;
        }

        var total = 0;
        for (var key in data) {
            var item = data[key];
            add_row(body, i18n.gettext(item.display_name), item.volume);
            total += item.volume;
        }
        add_row(foot, i18n.gettext("Total"), total);
    });
});
</script>
