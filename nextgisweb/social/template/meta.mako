<%page args="title"/>

<%
    preview_link = request.env.pyramid.preview_link_view(request)
    image = preview_link['image']
    description = preview_link['description']
%>

%if image is not None or description is not None:
    <meta property="og:title" content="${title}"/>
    <meta property="og:url" content="${request.url}"/>
    %if image is not None:
        <meta property="og:image" content="${image}"/>
    %endif
    %if description is not None:
        <meta property="og:description" content="${tr(description)}"/>
    %endif
%endif
