<%! from nextgisweb.webmap.util import _ %>

<div style="text-align: center;">
    <p>${tr(_("Web map embedding is not allowed for %s domain in Web GIS settings.")) % request.headers['Referer']}</p>
    <p><a href="${request.current_route_url()}" target="_blank">${tr(_("Go to web map display page."))}</a></p>
</div>
