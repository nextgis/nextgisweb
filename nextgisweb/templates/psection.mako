<%inherit file='obj.mako' />

%for section in sections:
    %if section.is_applicable(obj):
        %if section.title:
            <h2>${tr(section.title)}</h2>
        %endif

        <div><%include file="${section.template}" args="layer=obj"/></div>
    %endif
%endfor