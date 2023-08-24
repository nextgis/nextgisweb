<%inherit file='nextgisweb:pyramid/template/base.mako' />

<% system_name = request.env.core.system_full_name() %>

<%include
    file="nextgisweb:pyramid/template/header.mako"
    args="title=system_name, hide_resource_filter=True"
/>

<div style="position: absolute; top: 50px; bottom: 0px; right: 0px;  width: 100%; display: flex">

<div style="flex-grow: 0; white-space: nowrap; padding: 1ex; border-right: 4px solid lightgray; overflow-y: scroll">
    %for te in testentries:
        <%
            label = te
            if label.startswith("@nextgisweb/"):
                label = label[len("@nextgisweb/"):]
            if label.endswith("/testentry"):
                label = label[:-len("/testentry")]
        %>
        <a style="display: block" href="${request.route_url('jsrealm.testentry', subpath=te)}">${label}</a>
    %endfor
</div>

<div id="teTarget" style="flex-grow: 1; overflow: scroll; padding: 1ex;">
    %if selected:
        <script type="text/javascript">
            require([
                "@nextgisweb/jsrealm/plugin!jsrealm.testentry/" + ${testentries[selected]['type'] | json_js},
                ${selected | json_js},
                "dojo/domReady!"
            ], (runner, {default: module}) => {
                runner(module, document.getElementById('teTarget'));
            })
        </script>
    %endif
</div>

</div>