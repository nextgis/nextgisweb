<% capcache = obj.capcache_dict %>

<table class="pure-table pure-table-vertical" style="width: 100%; margin-bottom: 1em"><tbody>
    <tr>
        <th>Загружено</th>
        <td style="width: auto">${obj.capcache_tstamp}</td>
    </tr>
    <tr>
        <th>Доступные форматы</th>
        <td style="width: auto">${', '.join(capcache['formats'])}</td>
    </tr>
</tbody></table>

<table class="pure-table pure-table-horizontal" style="width: 100%">
    <thead><tr>
        <th style="width: 2em;">#</th>
        <th style="width: 20em;">Слой</th>
        <th style="width: auto">Наименование</th>
    </tr></thead>

    %for idx, l in enumerate(capcache['layers'], start=1):
    <tr>
        <td>${idx}</td>
        <td><tt>${l['id']}</tt></td>
        <td>${l['title']}</td>
    </tr>
    %endfor

</table>
