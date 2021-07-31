<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.pyramid.util import _ %>

<%def name="title_block()">
    <div id="info-copy-btn" style="float: right"></div>
    <h1>${tr(title)}</h1>
</%def>


<% distr_opts = request.env.options.with_prefix('distribution') %>
<% support_url = request.env.core.support_url_view(request) %>
%if distr_opts.get('name') is not None:
    <h2>${distr_opts.get('description')} ${distr_opts.get('version')} (${distr_opts.get('date')})</h2>
    <div id="distInfo"><div data-dojo-id="distInfo"
        data-dojo-type="ngw-pyramid/DistInfo/DistInfo"
        data-dojo-props='
            status: "inProgress",
            currentVersion: `${distr_opts.get("version")} (${distr_opts.get("date")})`,
            supportUrl: "${support_url}"
        '
        style="margin-bottom: 16px;"></div></div>
%endif
<div class="content-box">
    <div class="table-wrapper">
        <table id="package-table" class="pure-table pure-table-horizontal">

            <thead><tr> 
                <th class="sort-default" style="width: 100%; text-align: inherit;">${tr(_('Package'))}</th>
                <th style="width: 8em; text-align: inherit;" colspan="2" data-sort-method='dotsep'>${tr(_('Version'))}</th>
            </tr></thead>

            <tbody>

            <%
                packages = list(request.env.packages.items())
                packages.sort(key=lambda i: '' if i[0] == 'nextgisweb' else i[0])
            %>
            
            %for pname, pobj in packages:
            <tr>
                <td>${pobj.name}</td>
                <td>${pobj.version}</td>
                <td>
                    %if pobj.commit:
                        ${pobj.commit + ('+' if pobj.dirty else '')}
                    %else:
                        &nbsp;
                    %endif
                </td>
            </tr>
            %endfor

            </tbody>
        </table>
    </div>
</div>

<h2>${tr(_('Platform'))}</h2>

<div class="content-box"><div class="table-wrapper">
    <table id="package-table" class="pure-table pure-table-horizontal"><tbody>
    %for comp in request.env._components.values():
        %for k, v in comp.sys_info():
            <tr>
                <th>${tr(k)}</th>
                <td>${tr(v)}</td>
            </tr>
        %endfor
    %endfor
    </tbody> </table>
</div></div>


<script>
    require([
        "dojo/ready",
        "dojo/parser",
        "ngw-pyramid/CopyButton/CopyButton",
        "ngw-pyramid/DistInfo/DistInfo",
        "@nextgisweb/pyramid/update",
    ], function (
        ready, 
        parser,
        CopyButton,
        DistInfo,
        update,
    ) {
        ready(function() {
            var nodeDistInfo = document.getElementById('distInfo');
            if (nodeDistInfo) {
                parser.parse(nodeDistInfo);
                distInfo.set('detailsUrl', update.notesUrl());
            }

            update.registerCallback(function(data) {
                const distribution = data.distribution;
                if (distribution && distribution.status === "has_update") {
                    distInfo.set('nextVersion', distribution.latest.version + ' (' + distribution.latest.date + ')');
                    distInfo.set('status', 'hasUpdate');
                }
                if (distribution && distribution.status === "has_urgent_update") {
                    distInfo.set('nextVersion', distribution.latest.version + ' (' + distribution.latest.date + ')');
                    distInfo.set('status', 'hasUrgentUpdate');
                }
                if (distribution && distribution.status === "up_to_date") {
                    distInfo.set('status', 'upToDate');
                }
            });
        });
        var domCopyButton = document.getElementById("info-copy-btn")
        var copyButton = new CopyButton({
            targetAttribute: function (target) {
                return document.getElementById("content-wrapper").innerText;
            }
        });
        copyButton.placeAt(domCopyButton);
    });
</script>
