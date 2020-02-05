<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.audit.util import _ %>

<%def name="head()">
    <script>
        require([
            "dojo/ready",
            "dojo/parser",
            "ngw/sorted-table"
        ], function(
            ready,
            parser,
            sortedTable
        ){
            ready(function() {
                sortedTable(document.getElementById("journal-table"));
                parser.parse();
            });
        });
    </script>
</%def>

<div class="journal-toolbar ngw-toolbar ngw-toolbar--space-between">
    <div class="ngw-toolbar__inner"
        data-dojo-type="ngw-audit/JournalFilter/JournalFilter"
        data-dojo-props="
            users: [
                {   
                    label: 'All users',
                    value: 1,
                    selected: true,
                },
                {
                    label: 'administrator',
                    value: 2,
                    selected: false,
                },
                {
                    label: 'guest',
                    value: 3,
                    selected: false,
                }
            ]">
    </div>
    <div data-dojo-type="ngw-pyramid/NGWButton/NGWButton"
        data-dojo-props="size: 'small', type: 'outlined', color: 'secondary', icon: 'publish', label: '${tr(_('Export'))}'">
    </div>   
</div>
<div class="content-box">
    <div class="table-wrapper">
        <table id="journal-table" class="pure-table pure-table-horizontal" style="table-layout: fixed;">
            <thead><tr> 
                <th class="sort-default" style="text-align: inherit;">${tr(_('Timestamp'))}</th>
                <th class="sort-default" style="text-align: inherit;">${tr(_("Method"))}</th>
                <th class="sort-default" style="text-align: inherit;">${tr(_("Path"))}</th>
                <th class="sort-default" style="text-align: inherit;">${tr(_("Status code"))}</th>
                <th class="sort-default" style="text-align: inherit;">${tr(_("Route name"))}</th>
                <th class="sort-default" style="text-align: inherit;">${tr(_("User"))}</th>
            </tr></thead>

            <tbody>
            
            %for doc in docs:
            <% item = doc['_source'] %>
            <tr>
                <td>${item['@timestamp']}</td>
                <td>${item['request']['method']}</td>
                <td>${item['request']['path']}</td>
                <td>${item['response']['status_code']}</td>
                <td>${item['response']['route_name']}</td>
                <td>${item['user']['keyname']}</td>
            </tr>
            %endfor

            </tbody>
        </table>
    </div>
</div>