<%! from nextgisweb.resource.util import _ %>
<table class="meta-info table-keyvalue pure-table">
    <tbody>
        <tr>
            <th class="table-keyvalue__key">
                <span class="table-keyvalue__key__inner">${tr(_("Display name"))}</span>
            </th>
            <td class="table-keyvalue__value">
                <span class="table-keyvalue__value__inner">${obj.display_name}</span>
            </td>
        </tr>        
        %if obj.keyname:
            <tr>
                <th class="table-keyvalue__key">
                    <span class="table-keyvalue__key__inner">${tr(_("Keyname"))}</span>
                </th>
                <td class="table-keyvalue__value">
                    <span class="table-keyvalue__value__inner">${obj.keyname}</span>
                </td>
            </tr>
        %endif        
        %if hasattr(obj, 'get_info'):
            %for key, value in obj.get_info():
            <tr>
                <th class="table-keyvalue__key">
                    <span class="table-keyvalue__key__inner">${tr(key)}</span>
                </th>
                <td class="table-keyvalue__value">
                    <span class="table-keyvalue__value__inner">${tr(value)}</span>
                </td>
            </tr>
            %endfor
        %endif
        <tr>
            <th class="table-keyvalue__key">
                <span class="table-keyvalue__key__inner">${tr(_("Type"))}</span>
            </th>
            <td class="table-keyvalue__value">
                <span class="table-keyvalue__value__inner">${tr(obj.cls_display_name)} (${obj.cls})</span>
            </td>
        </tr>
        <tr>
            <th class="table-keyvalue__key">
                <span class="table-keyvalue__key__inner">${tr(_("Owner"))}</span>
            </th>
            <td class="table-keyvalue__value">
                <span class="table-keyvalue__value__inner">${obj.owner_user}</span>
            </td>
        </tr>
    </tbody>
</table>