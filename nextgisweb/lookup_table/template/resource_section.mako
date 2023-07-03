<%page args="items" />

<h2>${tr(_("Items"))}</h2>

<table class="pure-table pure-table-bordered">
    <thead>
        <tr>
            <th>${tr(_("Key"))}</th>
            <th>${tr(_("Value"))}</th>
        </tr>
    </thead>
   % for key, value in items:
   <tr>
       <td>${key}</td>
       <td>${value}</td>
   </tr>
   % endfor
</table>
