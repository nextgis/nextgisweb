<%!
    from nextgisweb.gui.view import REACT_BOOT_JSENTRY
    from nextgisweb.pyramid.view import LAYOUT_JSENTRY
%>

<%page args="title"/>

<div id="header">
    ##     %if not hide_resource_filter:
    ##         <div class="header-resources-filter" id="resourcesFilter"></div>
    ##     %endif
</div>

<script type="text/javascript">
    Promise.all([
        ngwEntry(${json_js(REACT_BOOT_JSENTRY)}).then((m) => m.default),
        ngwEntry(${json_js(LAYOUT_JSENTRY)}),
    ]).then(([reactBoot, {Header}]) => {
        reactBoot(Header, {title: ${json_js(title)}}, document.getElementById("header"));
        
        ## %if not hide_resource_filter:
        ##     ngwEntry(${json_js(RESOURCE_FILTER_JSENTRY)}).then(
        ##         ({default: ResourcesFilter}) => reactBoot(
        ##             ResourcesFilter,
        ##             { onChange(v, opt) { window.location.href = opt.url } },
        ##             document.getElementById("resourcesFilter"),
        ##         )
        ##     );
        ## %endif
    });
</script>
