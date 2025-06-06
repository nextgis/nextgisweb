<%! from nextgisweb.gui.view import REACT_BOOT_JSENTRY %>

<%page args="jsentry, props={}, name='default', element=None"/>

<script type="text/javascript">(() => {
    %if element is None:
        const element = document.createElement("div");
        element.classList.add("ngw-gui-react-boot");
        const current = document.currentScript;
        current.parentNode.insertBefore(element, current.nextSibling);
    %else:
        const element = document.getElementById(${json_js(element)});
    %endif

    Promise.all([
        ngwEntry(${json_js(REACT_BOOT_JSENTRY)}).then((m) => m.default),
        ngwEntry(${json_js(jsentry)}).then((m) => m[${json_js(name)}]),
    ]).then(([reactBoot, Component]) => {
        reactBoot(
            Component,
            ${json_js(props)},
            element,
        );
    });    
})()</script>