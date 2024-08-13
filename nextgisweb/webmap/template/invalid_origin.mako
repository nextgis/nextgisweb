<%inherit file='nextgisweb:pyramid/template/plain.mako' />

<p>${tr(gettext("Web map embedding is not allowed for %s in the Web GIS settings.")) % origin}</p>
<p><a href="${webmap_url}" target="_blank">
    ${tr(gettext("View the map on %s") % domain)}
</a></p>