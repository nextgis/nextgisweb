<%page args="dynmenu, args" />

<%namespace file="nextgisweb:pyramid/template/util.mako" import="icon"/>

<% from nextgisweb import dynmenu as dm %>

<script>
    require([
        "dojo/ready",
        "svg4everybody/svg4everybody"
    ], function(
        ready,
        svg4everybody
    ){
        ready(function() {
            svg4everybody();
        });
    });
</script>

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
            ## TODO: Fix CSS styles to support material icons. There is no way to change
            ## material icons size. Just remove 'and item.icon.startswith('svg:')' and
            ## layout will be broken.
            <% show_icon = item.icon and item.icon.startswith('svg:') %>
            %if show_icon:
                <a href="${url}" class="sidebar-menu__link text-withIcon text-withIcon_size_s">
                    ${icon(item.icon, size='s')} ${tr(item.label)}
                </a>
            %else:
                <a href="${url}" target="${item.target}" class="sidebar-menu__link">${tr(item.label)}</a>
            %endif
        </li>
    %endif
%endfor
</ul>
