<%page args="dynmenu, args" />

<%namespace file="nextgisweb:pyramid/template/util.mako" import="icon_svg"/>

<% from nextgisweb import dynmenu as dm %>

<ul class="sidebar-menu list-unstyled">
<% label = None %>
%for item in dynmenu.build(args):
    %if isinstance(item, dm.Label):
        <% label = item %>
    %elif isinstance(item, dm.Link):
        %if label is not None:
            <li class="sidebar-menu__heading heading">${tr(label.label)}</li>
            <% label = None %>
        %endif
        <% url = item.url(args) %>
        <li class="sidebar-menu__item${' sidebar-menu__item--selected' if url == request.url else ''}">
            <a href="${url}" target="${item.target}" class="sidebar-menu__link withIcon withIcon-s">
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
