<table class="pure-table pure-table-vertical" style="margin-bottom: 1em"><tbody>
    <tr>
        <th>Наименование</th>
        <td>${obj.display_name}</td>
    </tr>

    %if obj.keyname:
    <tr>
        <th>Ключ</th>
        <td>${obj.keyname}</td>
    </tr>
    %endif

    <tr>
        <th>Тип ресурса</th>
        <td>${obj.cls_display_name} (${obj.cls})</td>
    </tr>

    <tr>
        <th>Владелец</th>
        <td>${obj.owner_user}</td>
    </tr>
</tbody></table>