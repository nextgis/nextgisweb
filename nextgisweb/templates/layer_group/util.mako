<%def name="header_path(parents)">
    <% from nextgisweb.layer_group import LayerGroup %>
    <% from nextgisweb.layer import Layer %>
    %for p in parents:
        %if isinstance(p, LayerGroup):
          <a href="${request.route_url('layer_group.show', id=p.id)}">${p.display_name}</a></span>
        %endif
    %endfor
</%def>

<%def name="title_block()">
    %if subtitle:
        ${header_path(obj.parents + (obj, ))}
        <h1>${subtitle}</h1>
    %else:
        ${header_path(obj.parents)}
        <h1>${obj.display_name}</h1>
    %endif
</%def>