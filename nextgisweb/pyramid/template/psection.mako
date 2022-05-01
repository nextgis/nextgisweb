<%inherit file='obj.mako' />

%for section in sections:
    %if section.is_applicable(obj):
        %if section.title:
            <h2>${tr(section.title)}</h2>
        %endif
        %if section.key in ['summary','description']:
            <%include file="${section.template}" args="layer=obj"/>
        %else:
            <div class="content-box">
                <%include file="${section.template}" args="layer=obj"/>
            </div>
        %endif
    %endif
%endfor