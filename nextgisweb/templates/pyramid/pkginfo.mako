<%inherit file='../base.mako' />

<table class="pure-table pure-table-horizontal" style="width: 100%;">

    <thead><tr> 
        <th style="width: 100%">Пакет</th>
        <th style="width: 8em;">Версия</th>
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