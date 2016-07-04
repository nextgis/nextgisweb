<%! from nextgisweb.wmsclient.util import _ %>
<% capcache = obj.capcache_dict %>

<table class="table-keyvalue pure-table"><tbody>
    <tr>
        <th class="table-keyvalue__key">
            <span class="table-keyvalue__key__inner">${tr(_('Timestamp'))}</span>
        </th>
        <td class="table-keyvalue__value">
            <span class="table-keyvalue__value__inner">${obj.capcache_tstamp}</span>
        </td>
    </tr>
    <tr>
        <th class="table-keyvalue__key">
            <span class="table-keyvalue__key__inner">${tr(_('Image format'))}</span>
        </th>
        <td class="table-keyvalue__value">
            <span class="table-keyvalue__value__inner">${', '.join(capcache['formats'])}</span>
        </td>
    </tr>
</tbody></table>

<table class="pure-table pure-table-horizontal">
    <thead><tr>
        <th style="width: 2em; text-align: inherit;">#</th>
        <th style="width: 30%; text-align: inherit;">${tr(_('Layer'))}</th>
        <th style="width: 70%; text-align: inherit;">${tr(_('Title'))}</th>
    </tr></thead>

    %for idx, l in enumerate(capcache['layers'], start=1):
    <tr>
        <td>${idx}</td>
        <td><tt>${l['id']}</tt></td>
        <td>${l['title']}</td>
    </tr>
    %endfor

</table>
