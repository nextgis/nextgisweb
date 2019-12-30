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
            
    parents.append(obj)
    
    if subtitle and obj:
        parents.append(tr(subtitle))
%>

<%def name="title()"><%
    if subtitle:
        return tr(subtitle)
    else:
        return six.text_type(obj)
%></%def>

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

    parents.append(obj)
    
    if subtitle and obj:
        parents.append(tr(subtitle))
%>
    %if len(parents) > 1:
        <div class="path">           
            %for idx, parent in enumerate(parents):                
                <span class="path__item">
                %if hasattr(parent, 'permalink') and idx!=len(parents)-1:
                    <a class="path__link" href="${parent.permalink(request)}">${parent}</a>
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