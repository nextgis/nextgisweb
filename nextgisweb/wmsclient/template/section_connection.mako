<%! from nextgisweb.wmsclient.util import _ %>
<% capcache = obj.capcache_dict %>

<table class="pure-table pure-table-vertical" style="width: 100%; margin-bottom: 1em"><tbody>
    <tr>
        <th>${tr(_('Timestamp'))}</th>
        <td style="width: auto">${obj.capcache_tstamp}</td>
    </tr>
    <tr>
        <th>${tr(_('Image format'))}</th>
        <td style="width: auto">${', '.join(capcache['formats'])}</td>
    </tr>
</tbody></table>

<table class="pure-table pure-table-horizontal" style="width: 100%">
    <thead><tr>
        <th style="width: 2em;">#</th>
        <th style="width: 20em;">${tr(_('Layer'))}</th>
        <th style="width: auto">${tr(_('Title'))}</th>
    </tr></thead>

    %for idx, l in enumerate(capcache['layers'], start=1):
    <tr>
        <td>${idx}</td>
        <td><tt>${l['id']}</tt></td>
        <td>${l['title']}</td>
    </tr>
    %endfor

</table>
