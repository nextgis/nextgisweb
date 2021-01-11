<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.spatial_ref_sys.util import _ %>

<div id="error-message" class="content-box" style="display:none; background-color: #deb4a9"></div>


<%def name="head()">
    <script>
        require([
            "dojo/ready",
            "ngw/sorted-table",
            "ngw-spatial-ref-sys/catalog_browse",
        ], function(
            ready,
            sortedTable,
            catalogFilter
        ){
            ready(function() {
                sortedTable(document.getElementById("catalog-table"));
            });
        });
    </script>
</%def>

<div class="content-box">
    <form id="search-form">
        <input id="text-filter" type="text submit" placeholder="${tr(_('Search'))}"
            style="width: 250px"/>
        <input id="lat-filter" type="number" min="-90" max="90" placeholder="${tr(_('Latitude'))}, °"
            style="margin-left: 50px; width: 90px"/>
        <input id="lon-filter" type="number" min="-180" max="180" placeholder="${tr(_('Longitude'))}, °"
            style="width: 90px"/>
        <input type="submit" style="display: none">
    </form>
</div>

<div class="content-box">
    <div class="table-wrapper">
        <table id="catalog-table" class="pure-table pure-table-horizontal">
            <thead>
                <tr>
                    <th class="sort-default" style="text-align: inherit;">${tr(_("SRS name"))}</th>
                    <th class="sort-default" style="text-align: inherit;">${tr(_("Auth name"))}</th>
                    <th class="sort-default" style="text-align: inherit;">${tr(_("Auth SRID"))}</th>
                    <th class="no-sort" style="width: 0px;">&nbsp;</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>
</div>
