<%!
    from nextgisweb.gui.view import REACT_BOOT_JSENTRY
    from nextgisweb.resource.view import EXTERNAL_ACCESS_JSENTRY
%>

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
    ngwEntry(${json_js(REACT_BOOT_JSENTRY)}).then(({ default: reactBoot}) => {
        reactBoot(
            ${json_js(EXTERNAL_ACCESS_JSENTRY)},
            { links: ${json_js(links)} },
            "externalAccessSection"
        );
    });
</script>
