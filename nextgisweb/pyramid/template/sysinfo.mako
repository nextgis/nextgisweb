<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.pyramid.util import _ %>

<div id="info-copy-btn" style="/*display: inline-block*/"></div>

<div id="info" style="margin-top: 5px;">

<% distr_opts = request.env.options.with_prefix('distribution') %>
%if distr_opts.get('name') is not None:
    <h2>${tr(_('Distribution'))}</h2>

    <table id="package-table" class="pure-table pure-table-horizontal">
    <tbody>
        <tr>
            <td>${tr(_("Description"))}</td>
            <td>${distr_opts.get('description')}</td>
        </tr>
        <tr>
            <td>${tr(_("Version"))}</td>
            <td>${distr_opts.get('version')}</td>
        </tr>
        <tr>
            <td>${tr(_("Date"))}</td>
            <td>${distr_opts.get('date')}</td>
        </tr>
    </tbody>
    </table>
%endif

<h2>${tr(_('Platform'))}</h2>

<table id="package-table" class="pure-table pure-table-horizontal">
<tbody>
%for comp in request.env._components.values():
    %for k, v in comp.sys_info():
        <tr>
            <td>${k}</td>
            <td>${v}</td>
        </tr>
    %endfor
%endfor
</tbody>
</table>

<h2>${tr(_('Packages'))}</h2>
<div class="content-box">
    <div class="table-wrapper">
        <table id="package-table" class="pure-table pure-table-horizontal">

            <thead><tr> 
                <th class="sort-default" style="width: 100%; text-align: inherit;">${tr(_('Package'))}</th>
                <th style="width: 8em; text-align: inherit;" colspan="2" data-sort-method='dotsep'>${tr(_('Version'))}</th>
            </tr></thead>

            <tbody>
            
            %for dinfo in distinfo:
            <tr>
                <td>${dinfo.name}</td>
                <td>
                    ${dinfo.version}
                </td>
                <td>
                    %if dinfo.commit:
                        ${dinfo.commit}
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
</div>

<script>
require([
    "ngw-pyramid/CopyButton/CopyButton",
], function (CopyButton) {
    var domCopyButton = document.getElementById("info-copy-btn")
    var copyButton = new CopyButton({
        targetAttribute: function (target) {
            return document.getElementById("info").innerText;
        }
    });
    copyButton.placeAt(domCopyButton);
});
</script>
