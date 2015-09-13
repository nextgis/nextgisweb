<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.pyramid.util import _ %>

<table class="pure-table pure-table-horizontal" style="width: 100%;">

    <thead><tr> 
        <th style="width: 100%">${tr(_('Package'))}</th>
        <th style="width: 8em;">${tr(_('Version'))}</th>
    </tr></thead>

    <tbody>
    
    %for pkg, ver in pkginfo:
    <tr>
        <td>${pkg}</td>
        <td>${ver}</td>
    </tr>
    %endfor

    </tbody>

</table>