<%page args="lookup_value" />

<h2>${tr(gettext("Items"))}</h2>

<table class="pure-table pure-table-bordered">
    <thead>
        <tr>
            <th>${tr(gettext("Key"))}</th>
            <th>${tr(gettext("Value"))}</th>
        </tr>
    </thead>
    % for key, value in lookup_value:
        <tr>
            <td>${key}</td>
            <td>${value}</td>
        </tr>
    % endfor
</table>
