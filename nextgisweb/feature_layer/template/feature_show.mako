<%inherit file="nextgisweb:templates/obj.mako" />

<h2>Атрибуты</h2>

<table class="pure-table pure-table-horizontal" style="width: 100%">
    %for k, v in feature.fields.iteritems():
        <tr>
            <th style="width: 10em;">${k}</th>
            <td>${v}</td>
        </tr>   
    %endfor
</table>


<h2>Геометрия GeoJSON</h2>

<% import geojson %>
<pre>${ geojson.dumps(feature.geom, indent=4) | n}</pre>