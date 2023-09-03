<%page args="dynmenu, args" />

<%! from nextgisweb.lib import dynmenu as dm %>
<%namespace file="nextgisweb:pyramid/template/util.mako" import="icon_svg"/>

<ul class="ngw-pyramid-dynmenu">
<% label = None %>
%for item in dynmenu.build(args):
    %if isinstance(item, dm.Label):
        <% label = item %>
    %elif isinstance(item, dm.Link):
        %if label is not None:
            <li class="label">${tr(label.label)}</li>
            <% label = None %>
        %endif
        <% url = item.url(args) %>
        <li class="item${' selected' if url == request.url else ''}">
            <a href="${url}" target="${item.target}">
                %if item.icon:
                    ${icon_svg(item.icon)}
                %endif
                ${tr(item.label)}
                %if item.icon_suffix:
                    ${icon_svg(item.icon_suffix, 'icon-s')}
                %endif
            </a>
        </li>
    %endif
%endfor
</ul>
