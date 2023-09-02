<%page args="section"/>
<% section.content_box = False %>

<% capcache = obj.capcache_dict %>

<table class="pure-table pure-table-horizontal ngw-card" style="width: 100%">
    <thead>
        <tr>
            <th style="width: 2em; text-align: inherit;">#</th>
            <th style="width: 30%; text-align: inherit;">${tr(_('Layer'))}</th>
            <th style="width: 70%; text-align: inherit;">${tr(_('Title'))}</th>
        </tr>
    </thead>
    <tbody>
    %for idx, l in enumerate(capcache['layers'], start=1):
        <tr>
            <td>${idx}</td>
            <td><tt>${l['id']}</tt></td>
            <td>${l['title']}</td>
        </tr>
    %endfor
    </tbody>
</table>
