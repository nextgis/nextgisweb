<%inherit file='nextgisweb:pyramid/template/plain.mako' />
<%! from nextgisweb.pyramid.util import _ %>

<p>${tr(_("Web map embedding is not allowed for %s in the Web GIS settings.")) % origin}</p>
<p><a href="${webmap_url}" target="_blank">
    ${tr(_("View the map on %s") % domain)}
</a></p>