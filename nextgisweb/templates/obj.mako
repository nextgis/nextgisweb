<%inherit file='base.mako' />

<%
    current = obj
    parents = []
    while current:
        if hasattr(current, 'parent') and current.parent:
            parents.insert(0, current.parent)
            current = current.parent
        else:
            current = None

    if subtitle and obj:
        parents.append(obj)

%>

<%def name="title()">
    %if subtitle:
        ${tr(subtitle)}
    %else:
        ${obj}
    %endif
</%def>

<%def name="title_block()">
<%
    current = obj
    parents = []
    while current:
        if hasattr(current, 'parent') and current.parent:
            parents.insert(0, current.parent)
            current = current.parent
        else:
            current = None

    if subtitle and obj:
        parents.append(obj)

%>
    %if len(parents) > 0:
        <div class="span-24 path">
            <% first = True %>
            %for parent in parents:
                %if not first:
                    &rarr;
                %endif
                <% first = False %>
                <span>
                %if hasattr(parent, 'permalink'):
                    <a href="${parent.permalink(request)}">${parent}</a>
                %else:
                    ${parent}
                %endif
                </span> 
            %endfor
        </div>
    %endif

    %if subtitle:
        <h1>${tr(subtitle)}</h1>
    %elif obj:
        <h1>
            ${obj}
        </h1>
    %endif
</%def>


%if hasattr(next, 'body'):
    ${next.body()}
%endif