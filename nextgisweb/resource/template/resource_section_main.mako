<%!
    from nextgisweb.pyramid.api import csetting
    from nextgisweb.gui.view import REACT_BOOT_JSENTRY
    from nextgisweb.resource.view import creatable_resources, MAIN_SECTION_JSENTRY
%>

<%page args="section" />
<% section.content_box = False %>

<%
    props = dict(resourceId=obj.id)

    summary = props["summary"] = []
    summary.append((tr(gettext("Type")), f"{tr(obj.cls_display_name)} ({obj.cls})"))
    if keyname := obj.keyname:
        summary.append((tr(gettext("Keyname")), keyname))

    if get_info := getattr(obj, 'get_info', None):
        for key, value in get_info():
            summary.append((tr(key), str(tr(value))))

    summary.append((tr(gettext("Owner")), tr(obj.owner_user.display_name_i18n)))

    props["creatable"] = [c.identity for c in creatable_resources(obj, user=request.user)]
%>

<div id="resourceMainSection" class="ngw-resource-section"></div>

<script type="text/javascript">
    ngwEntry(${json_js(REACT_BOOT_JSENTRY)}).then(({ default: reactBoot}) => {
        reactBoot(
            ${json_js(MAIN_SECTION_JSENTRY)},
            ${json_js(props)},
            "resourceMainSection"
        );
    });
</script>
