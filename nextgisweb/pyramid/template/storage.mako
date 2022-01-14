<%inherit file='nextgisweb:templates/base.mako' />
<%! import json %>
<%! from nextgisweb.pyramid.util import _ %>
<%! from nextgisweb.core import KindOfData %>
<%! from markupsafe import Markup %>
<%! from humanize import naturalsize %>

<%!

def format_size(v):
    return Markup(naturalsize(v, binary=True, format='%.0f').replace(' ', '&nbsp;'))

%>

<%
    data = request.env.core.query_storage()
    total = data.get("")
    limit = request.env.core.options['storage.limit']

    estimation_running = request.env.core.estimation_running()
%>

%if total:
    <div class="content-box">
        <div class="table-wrapper">
            <table id="storage-summary" class="pure-table pure-table-horizontal">
                <thead><tr> 
                    <th style="width: 80%; text-align: inherit;">${tr(_("Kind of data"))}</th>
                    <th style="width: 20em; text-align: right;">${tr(_("Volume"))}</th>
                </tr></thead>

                <tbody id="storage-body">
                    %for k, v in data.items():
                        <% if k == '': continue %>
                        <tr>
                            <td>${tr(KindOfData.registry[k].display_name)}</td>
                            <td data-sort="${v['data_volume']}" style="text-align: right">${format_size(v['data_volume'])}</td>
                        </tr>
                    %endfor
                </tbody>

                <tfoot id="storage-foot">
                    <tr>
                        <th style="text-align: inherit;">${tr(_("Total"))}</th>
                        <th style="text-align: right;">${format_size(total["data_volume"])}</th>
                    </tr>
                    %if limit is not None:
                        <tr>
                            <th style="text-align: inherit;">${tr(_("Usage"))}</th>
                            <th style="text-align: right;">
                                ${'%.0f%%' % (100 * total["data_volume"] / limit)}
                                ${tr(_("of"))}
                                ${format_size(limit)}
                            </th>
                        </tr>
                    %endif
                </tfoot>
            </table>
        </div>
    </div>
%endif

<%
    estimated = total['estimated'] if total else None
    updated = total['updated'] if total else None

    estimated = estimated.replace(microsecond=0).isoformat(' ') if estimated else None
    updated = updated.replace(microsecond=0).isoformat(' ') if updated else None
%>

<div style="float:right">
    <button id="estimateBtn" type="button"></button>
</div>

%if estimated and updated:
    ${tr(_("Storage usage was fully estimated at %s and updated at %s.") % (
        estimated, updated))}<br>
%elif estimated:
    ${tr(_("Storage usage was fully estimated at %s.") % estimated)}<br>
%elif updated:
    ${tr(_("Storage usage hasn't been estimated yet but was updated at %s.") % updated)}<br>
%else:
    ${tr(_("Storage usage hasn't been estimated yet."))}<br>
%endif

${tr(_("Some changes may be reflected only after full estimation."))}

<script type="text/javascript">
    require([
        "@nextgisweb/pyramid/tablesort",
        "ngw-pyramid/NGWButton/NGWButton",
        "ngw-pyramid/ErrorDialog/ErrorDialog",
        "dojo/on",
        "@nextgisweb/pyramid/api",
        "dojo/domReady!"
    ], function (
        tablesort, Button, ErrorDialog, on, api
    ) {
        %if total:
            tablesort.byId("storage-summary");
        %endif

        %if estimation_running:
            var estimateBtn = new Button({
                label: ${json.dumps(tr(_("Estimation is in progress...")), ensure_ascii=False) | n},
                color: 'secondary',
                disabled: true
            }, "estimateBtn");
            setInterval(function () {
                api.route('pyramid.storage_status').get().then(function(result) {
                    if (!result.estimation_running) {
                        location.reload();
                    }
                });
            }, 10000);
        %else:
            var estimateBtn = new Button({
                label: ${json.dumps(tr(_("Estimate storage")), ensure_ascii=False) | n},
                color: 'secondary'
            }, "estimateBtn");

            on(estimateBtn, 'click', function () {
                api.route('pyramid.estimate_storage').post().then(
                    function () {
                        location.reload();
                    },
                    function (err) {
                        new ErrorDialog(err).show()
                    }
                );
            });
        %endif

    });
</script>

