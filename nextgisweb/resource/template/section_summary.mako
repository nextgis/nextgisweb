<%! from nextgisweb.resource.util import _ %>
<ul class="meta-info list-unstyled">
    <li class="meta-info__item">
        <div class="meta-info__key"><span class="meta-info__key__inner">${tr(_("Display name"))}</span></div>
        <div class="meta-info__value">${obj.display_name}</div>
    </li>
     %if obj.keyname:
    <li class="meta-info__item">
        <div class="meta-info__key"><span class="meta-info__key__inner">${tr(_("Keyname"))}</span></div>
        <div class="meta-info__value">${obj.keyname}</div>
    </li>
    %endif
    
    %if hasattr(obj, 'get_info'):
        %for key, value in obj.get_info():
        <li class="meta-info__item">
            <div class="meta-info__key"><span class="meta-info__key__inner">${tr(key)}</span></div>
            <div class="meta-info__value">${tr(value)}</div>
        </li>
        %endfor
    %endif
    
    <li class="meta-info__item">
        <div class="meta-info__key"><span class="meta-info__key__inner">${tr(_("Type"))}</span></div>
        <div class="meta-info__value">${tr(obj.cls_display_name)} (${obj.cls})</div>
    </li>
    
    <li class="meta-info__item">
        <div class="meta-info__key"><span class="meta-info__key__inner">${tr(_("Owner"))}</span></div>
        <div class="meta-info__value">${obj.owner_user}</div>
    </li>
</ul>
