<table class="pure-table pure-table-horizontal ngw-card" style="width: 100%">
    <thead>
        <tr>
            <th style="width: 20%; text-align: inherit;">${tr(_("Key"))}</th>
            <th style="width: 60%; text-align: inherit; white-space: nowrap;">${tr(_("Value"))}</th>
        </tr>
    </thead>
    %for p in obj.vendor_params:
        <tr>
            <td>${p.key}</td>
            <td>${p.value}</td>
        </tr>
    %endfor
</table>
