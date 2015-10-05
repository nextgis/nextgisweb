<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.pyramid.util import _ %>
<%! from platform import platform %>
<%! import sys %>

<h2>${tr(_('Platform'))}</h2>
<p>${"Python %s on %s" % (sys.version, platform())}</p>

<h2>${tr(_('Packages'))}</h2>
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
