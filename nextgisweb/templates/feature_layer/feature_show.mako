<%inherit file="../obj.mako" />

<dl>
    %for k, v in feature.fields.iteritems():
        <dt>${k}</dt>
        <dd>${v}</dd>
    %endfor
</dl>


<h2>Геометрия</h2>

<% import geojson %>
<pre>${ geojson.dumps(feature.geom, indent=2) | n}</pre>