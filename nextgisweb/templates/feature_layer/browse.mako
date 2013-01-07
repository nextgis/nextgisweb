<%inherit file="../obj.mako" />
<% import geojson %>

${geojson.dumps(features)}

<table>
    <tr>
        <th>ID</th>
        <th>WKT</th>
        %for k in features.fields:
            <th>${k.keyname}</th>
        %endfor
    </tr>
    %for f in features:
        <tr>
            <td>${f.id}</td>
            %for k in features.fields:
                <td>${f.fields[k.keyname]}</td>
            %endfor
        </tr>
    %endfor

</table>

<script type="text/javascript">
    require(["dojo/parser"], function (parser) { parser.parse() });
</script>