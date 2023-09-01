<%page args="section"/>
<% section.content_box = False %>

<dl class="ngw-kv ngw-resource-section">
    %if obj.keyname:
        <dt>${tr(_("Keyname"))}</dt>
        <dd>${obj.keyname}</dd>
    %endif

    %if hasattr(obj, 'get_info'):
        %for key, value in obj.get_info():
            <dt>${tr(key)}</dt>
            <dd>${tr(value)}</dd>
        %endfor
    %endif

    <dt>${tr(_("Type"))}</dt>
    <dd>${tr(obj.cls_display_name)} (${obj.cls})</dd>

    <dt>${tr(_("Owner"))}</dt>
    <dd>${obj.owner_user}</dd>
</dl>     