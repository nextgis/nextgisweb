<%! from nextgisweb.resource.util import _ %>
<%page args="section"/>
<% section.content_box = False %>

<div class="content-box__description">${tr(_("Use these links to plug data into external applications."))}</div>

<div class="content-box section-api">
    <%block name="content"/>
</div>

<script type="text/javascript">
    require([
        "@nextgisweb/gui/react-app",
        "@nextgisweb/resource/external-access"
    ], function (reactApp, comp) {
        const sectionApiNodes = document.querySelectorAll(".section-api-item");
        if (sectionApiNodes.length === 0) return;
        const sectionApiNode = sectionApiNodes[0];
        reactApp.default(comp.default, {
            htmlDataset: sectionApiNode.dataset
        }, sectionApiNode);
    });
</script>
