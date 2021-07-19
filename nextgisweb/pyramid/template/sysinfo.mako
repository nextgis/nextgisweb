<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.pyramid.util import _ %>

<%def name="title_block()">
    <div id="info-copy-btn" style="float: right"></div>
    <h1>${tr(title)}</h1>
</%def>


<% distr_opts = request.env.options.with_prefix('distribution') %>
%if distr_opts.get('name') is not None:
    <h2>${distr_opts.get('description')} ${distr_opts.get('version')} (${distr_opts.get('date')})</h2>
    <div id="updateDistSummary" style="display: none; background-color: #cbecd9; margin: 2em 0; padding: 1em; border-radius: .5em">
        <a id="updateShowDistNotes" style="float: right">${tr(_("Show details"))}</a>
        ${tr(_("New version available:"))} <span id="updateDistVersion"></span><br/>
        <% support_url = request.env.core.support_url_view(request) %>
        %if support_url is not None:
            <% support_url +=  '?lang=' + request.locale_name %>
            <a href="${support_url}" target="_blank">${tr(_("Contact support"))}</a> ${tr(_("for update."))}
        %endif
    </div>
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
        "ngw-pyramid/CopyButton/CopyButton",
        "@nextgisweb/pyramid/OverlayDialog",
        "@nextgisweb/pyramid/update",
    ], function (
        CopyButton,
        OverlayDialog,
        update,
    ) {
        var domCopyButton = document.getElementById("info-copy-btn")
        var copyButton = new CopyButton({
            targetAttribute: function (target) {
                return document.getElementById("content-wrapper").innerText;
            }
        });
        copyButton.placeAt(domCopyButton);

        update.registerCallback(function(data) {
            const distribution = data.distribution;
            if (distribution && distribution.status === "has_update") {
                document.getElementById('updateDistVersion').innerHTML = distribution.latest.version + " (" + distribution.latest.date + ')';
                document.getElementById('updateDistSummary').style.display = 'inherit';
            }

            var showDistNotes = document.getElementById("updateShowDistNotes");
            if (showDistNotes) {
                showDistNotes.onclick = function () {
                    var iframe = document.createElement("iframe");
                    iframe.src = update.notesUrl();
                    iframe.setAttribute("frameborder", 0);
                    iframe.style.width = "70em";
                    iframe.style.height = "40em";

                    var dlg = new OverlayDialog.OverlayDialog({
                        content: iframe.outerHTML,
                    });
                    window.dlg = dlg;
                    dlg.show();
                }
            }

        })
    });
</script>
