<%! from nextgisweb.resource.util import _ %>
<%page args="section, links"/>
<%
    section.title = _("External access")
    section.content_box = False

    nextgis_docs = request.env.pyramid.options['nextgis_external_docs_links']

    links = [dict(
        title=tr(link.title),
        help=tr(link.help) if link.help else None,
        docUrl=link.doc_url if nextgis_docs else None,
        url=link.url,
    ) for link in links]
%>

<div class="content-box__description">${tr(_("Use these links to plug data into external applications."))}</div>

<div class="content-box">
    <div id="externalAccessSection"></div>
</div>


<script type="text/javascript">
    require([
        "@nextgisweb/resource/external-access",
        "@nextgisweb/gui/react-app",
    ], function (comp, reactApp) {
        reactApp.default(
            comp.default, 
            {links: ${json_js(links)}},
            document.getElementById('externalAccessSection')
        );
    });
</script>
