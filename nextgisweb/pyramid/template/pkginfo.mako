<%inherit file='nextgisweb:templates/base.mako' />
<%! from nextgisweb.pyramid.util import _ %>
<%! from platform import platform %>
<%! import sys %>

<h2>${tr(_('Platform'))}</h2>
<p>${"Python %s on %s" % (sys.version, platform())}</p>

<h2>${tr(_('Packages'))}</h2>
<div class="content-box">
    <table class="pure-table pure-table-horizontal" style="width: 100%;">

        <thead><tr> 
            <th style="width: 100%; text-align: inherit;">${tr(_('Package'))}</th>
            <th style="width: 8em; text-align: inherit;" colspan="2">${tr(_('Version'))}</th>
        </tr></thead>

        <tbody>
        
        %for dinfo in distinfo:
        <tr>
            <td>${dinfo.name}</td>
            <td>
                ${dinfo.version}
            </td>
            <td>
                %if dinfo.commit:
                    ${dinfo.commit}
                %else:
                    &nbsp;
                %endif
            </td>
        </tr>
        %endfor

        </tbody>

    </table>
</div>
