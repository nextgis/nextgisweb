<%page args="lookup_value" />

<h2>${tr(gettext("Items"))}</h2>

<table class="pure-table pure-table-bordered">
    <thead>
        <tr>
            <th>${tr(gettext("Key"))}</th>
            <th>${tr(gettext("Value"))}</th>
        </tr>
    </thead>
    % if lookup_value is not None:
        % for key, value in lookup_value.items():
            <tr>
                <td>${key}</td>
                <td>${value}</td>
            </tr>
        % endfor
    % endif
</table>
