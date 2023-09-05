<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="has_sidebar()"><% return selected is not None %></%def>
<%def name="sidebar()">${dynmenu()}</%def>

<%def name="dynmenu()">
    <ul class="ngw-pyramid-dynmenu">
    <% cgroup = None %>
    %for te in testentries:
        <%
            parts = te.split("/")
            group = "/".join(parts[0:2])
            if len(parts) > 3 and parts[-1] == "testentry":
                parts = parts[:-1]
            text = "/".join(parts[2:])
        %>
        %if cgroup != group:
            <% cgroup = group %>
            <li class="label">${group}</li>
        %endif
        <li class="item${' selected' if selected == te else ''}">
            <a href="${request.route_url('jsrealm.testentry', subpath=te)}">${text}</a>
        </li>
    %endfor
    </ul>
</%def>

%if not selected:
    ${dynmenu()}
%else:
    <div id="teTarget">
        <script type="text/javascript">
            require([
                "@nextgisweb/jsrealm/plugin!jsrealm.testentry/" + ${testentries[selected]['type'] | json_js},
                ${selected | json_js},
                "dojo/domReady!"
            ], (runner, {default: module}) => {
                runner(module, document.getElementById('teTarget'));
            })
        </script>
    </div>
%endif
