<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.spatial_ref_sys.util import _ %>

%if error_msg is not None:
    <div class="content-box" style="background-color: #deb4a9">
        ${error_msg}
    </div>
%endif


<%def name="head()">
    <script>
        require([
            "dojo/ready",
            "ngw/sorted-table",
            "ngw-spatial-ref-sys/catalog_filter",
        ], function(
            ready,
            sortedTable,
            catalogFilter
        ){
            ready(function() {
                sortedTable(document.getElementById("catalog-table"));
                catalogFilter(document.getElementById("catalog-filter"));
            });
        });
    </script>
</%def>

<div class="content-box">
    <input id="catalog-filter" type="text"/>
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
            <tbody>
                %for obj in obj_list:
                    <tr class="srs-row">
                        <td class="col-searchable">${obj['display_name']}</td>
                        <td class="col-searchable">${obj['auth_name']}</td>
                        <td class="col-searchable">${obj['auth_srid']}</td>
                        
                        <td class="fit-content">
                            <a class="material-icons icon-viewMap" target="_blank"
                               href="${request.route_url('srs.catalog.import', id=obj['id'])}"
                               title="${tr(_('View'))}"></a>
                        </td>
                    </tr>
                %endfor
            </tbody>
        </table>
    </div>
</div>
