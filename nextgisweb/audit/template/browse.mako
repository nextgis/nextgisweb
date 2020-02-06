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
    <style>
        .journal-table{
            table-layout: fixed;
        }

        .journal-table .circle{
            position: relative;
            top: -1;
            margin-right: 1px;
        }

        .journal-table tr:hover td:first-child{
            color: #076dbf;
        }
    </style>    
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
            ], defaultRange: 1">
    </div>
    <div data-dojo-type="ngw-pyramid/NGWButton/NGWButton"
        data-dojo-props="size: 'small', type: 'outlined', color: 'secondary', icon: 'publish', label: '${tr(_('Export'))}'">
    </div>   
</div>
<div class="content-box">
    <div class="table-wrapper">
        <table id="journal-table" class="journal-table pure-table pure-table-horizontal pure-table-horizontal--s">
            <colgroup>
                <col width="15%" />
                <col width="8%"/>
                <col width="10%"/>
                <col width="18%"/>
                <col width="18%" />
                <col/>
                <col/>
                <col width="15%"/>
            </colgroup>
            <thead><tr> 
                <th class="sort-default" style="text-align: inherit;">${tr(_('Timestamp'))}</th>                
                <th class="text-center">${tr(_("Status"))}</th>
                <th class="text-center">${tr(_("Method"))}</th>
                <th>${tr(_("Path"))}</th>
                <th>${tr(_("Route name"))}</th>
                <th colspan="2">${tr(_("Context"))}</th>                
                <th>${tr(_("User"))}</th>
            </tr></thead>

            <tbody class="small-text">
            
            %for doc in docs:
            <%
                rid = doc['_id']
                item = doc['_source']
            %>
            <tr style="cursor: pointer;" onClick="window.open('${request.route_url('audit.control_panel.journal.show', id=rid)}','_blank');">
               <!--  <td>
                    <a href="${request.route_url('audit.control_panel.journal.show', id=rid)}">
                    ${item['@timestamp']}
                    </a>
                </td> -->
                <td title="${item['@timestamp']}">
                    <!-- <a href="${request.route_url('audit.control_panel.journal.show', id=rid)}"> -->
                        05.02.2020 10:32:13
                    <!-- </a> -->
                </td>
                <td class="text-center">
                %if item['response']['status_code'] >= 400:
                    <span class="circle circle--danger"></span>
                %elif item['response']['status_code'] < 200 or item['response']['status_code'] >= 300:
                    <span class="circle circle--secondary"></span>
                %else:
                    <span class="circle circle--success"></span>
                %endif
                    <span class="v-middle">${item['response']['status_code']}</span>
                </td>
                <td class="text-center code-text">${item['request']['method']}</td>
                <td class="code-text" title="${item['request']['path']}">${item['request']['path']}</td>
                <td class="code-text" title="${item['response']['route_name'] if 'route_name' in item['response'] else NBSP}">
                    ${item['response']['route_name'] if 'route_name' in item['response'] else NBSP}</td>
                %if 'context' in item:
                    <td class="code-text" title="${item['context']['model']}">${item['context']['model']}</td>
                    <td class="code-text">${item['context']['id']}</td>
                %else:
                    <td class="code-text" style="white-space: nowrap; opacity: .8"> --- </td>
                    <td class="code-text" style="white-space: nowrap; opacity: .8"> --- </td>
                %endif
                <td>${item['user']['keyname'] if 'user' in item else NBSP}</td>
            </tr>
            %endfor

            </tbody>
        </table>
    </div>
</div>