<%inherit file='nextgisweb:pyramid/template/base.mako' />
<%! from nextgisweb.pyramid.uacompat import FAMILIES, parse_header as ua_parse_header %>

<%def name="title_ext()">
    <div id="info-copy-btn" style="float: right"></div>
</%def>


<% distr_opts = request.env.options.with_prefix('distribution') %>
<% support_url = request.env.core.support_url_view(request) %>
%if distr_opts.get('name') is not None:
    <h2>${distr_opts.get('description')} ${distr_opts.get('version')} (${distr_opts.get('date')})</h2>
    %if request.env.ngupdate_url:
        <div id="updateSysInfo"></div>
        <script type="text/javascript">
            require([
                "@nextgisweb/pyramid/update/sysinfo",
                "@nextgisweb/gui/react-app"
            ], function (
                updateSysInfo, reactApp
            ) {
                reactApp.default(
                    updateSysInfo.default, {},
                    document.getElementById("updateSysInfo"),
                );
            });
        </script>
    %endif
%endif

<table id="package-table" class="pure-table pure-table-horizontal ngw-card" style="width: 100%">
    <thead>
        <tr> 
            <th class="sort-default" style="width: 100%; text-align: inherit;">${tr(_('Package'))}</th>
            <th style="width: 8em; text-align: inherit;" colspan="2" data-sort-method='dotsep'>${tr(_('Version'))}</th>
        </tr>
    </thead>
    <tbody>
    <%
        packages = list(request.env.packages.items())
        packages.sort(key=lambda i: '' if i[0] == 'nextgisweb' else i[0])
    %>
    %for pname, pobj in packages:
        <tr>
            <td><%
                value = pobj.metadata['Summary']
                if value == 'UNKNOWN':
                    value = None
                if not value:
                    value = pobj.name
            %>${value}</td>
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

<h2>${tr(_('Platform'))}</h2>

<table id="package-table" class="pure-table pure-table-horizontal ngw-card" style="width: 100%">
    <tbody>
    %for comp in request.env.components.values():
        %for k, v in comp.sys_info():
        <tr>
            <th style="width: 20em">${tr(k)}</th>
            <td>${tr(v)}</td>
        </tr>
        %endfor
    %endfor
    </tbody>
</table>

<h2>${tr(_("Browser support"))}</h2>


<table id="browser-table" class="pure-table pure-table-horizontal ngw-card" style="width: 100%">
    <tbody>
    %for fid, fam in FAMILIES.items():
        <tr>
            <th style="width: 20em">${fam.alias}</th>
            <td>
                <% min_ver = request.env.pyramid.options[f"uacompat.{fid}"] %> 
                %if min_ver:
                    ${min_ver} ${tr(_("or higher"))}
                %else:
                    ${tr(_("Not supported"))}
                %endif
            </td>
        </tr>
    %endfor
    <%
        ua_header = request.user_agent
        ua_parsed = ua_parse_header(ua_header) if ua_header else None
        ua_family, ua_version = ua_parsed if ua_parsed else (None, None)
    %>
    %if ua_family and ua_version:
        <tr>
            <th>${tr(_("Your browser"))}</th>
            <td>
                ${FAMILIES[ua_family].alias}
                ${ua_version}
            </td>
        </tr>
    %endif
    </tbody>
</table>

<script>
    require([
        "dojo/ready",
        "ngw-pyramid/CopyButton/CopyButton",
    ], function (
        ready, 
        CopyButton,
    ) {
        var domCopyButton = document.getElementById("info-copy-btn")
        var copyButton = new CopyButton({
            targetAttribute: function (target) {
                return document.getElementById("content").innerText;
            }
        });
        copyButton.placeAt(domCopyButton);
    });
</script>
