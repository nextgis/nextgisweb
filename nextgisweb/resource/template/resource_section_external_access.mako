<%page args="section, links"/>
<%
    section.title = gettext("External access")
    section.content_box = False

    nextgis_docs = request.env.pyramid.options['nextgis_external_docs_links']

    links = [dict(
        title=tr(link.title),
        help=tr(link.help) if link.help else None,
        docsUrl=link.docs_url if nextgis_docs else None,
        url=link.url,
    ) for link in links]
%>

<div id="externalAccessSection"></div>

<script type="text/javascript">
    Promise.all([
        ngwEntry("@nextgisweb/gui/react-app").then((m) => m.default),
        ngwEntry("@nextgisweb/resource/external-access").then((m) => m.default),
    ]).then(([reactApp, comp]) => {
        reactApp(
            comp, 
            {links: ${json_js(links)}},
            document.getElementById('externalAccessSection')
        );
    });
</script>
