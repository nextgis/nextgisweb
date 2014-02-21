<table class="pure-table pure-table-horizontal" style="width: 100%">
    <thead>
        <tr>
            <th style="width: 5%">#</th>
            <th>Наименование</th>
            <th style="width: 20%">Тип</th>
            <th style="width: 20%">Владелец</th>
        </tr>
    </thead>
    %for idx, child in enumerate(obj.children, start=1):
        <tr>
            <td>${idx}</td>
            <td><a style="display: block" href="${child.permalink(request)}">${child.display_name}</a></td>
            <td>${child.cls_display_name}</td>
            <td>${child.owner_user}</td>
        </tr>
    %endfor
</table>