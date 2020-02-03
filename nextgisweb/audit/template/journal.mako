<%inherit file='nextgisweb:templates/base.mako' />
<%! 
    from markupsafe import Markup
    from nextgisweb.audit.util import _

    NBSP = Markup("&nbsp;")
%>

<%def name="head()">
    <script>
        require([
            "dojo/ready",
            "ngw/sorted-table"
        ], function(
            ready,
            sortedTable
        ){
            ready(function() {
                sortedTable(document.getElementById("journal-table"));
            });
        });
    </script>
</%def>

<div class="content-box">
    <div class="table-wrapper">
        <table id="journal-table" class="pure-table pure-table-horizontal">

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
                <td>${item['response']['route_name'] if 'route_name' in item['response'] else NBSP}</td>
                <td>${item['user']['keyname'] if 'user' in item else NBSP}</td>
            </tr>
            %endfor

            </tbody>
        </table>
    </div>
</div>