<%def name="render_action_panel(panel)">
    %for section in panel.sections:
        <div class="section">
            <div class="section-title">${section.title}</div>
            <div class="section-body">
                <ul>
                    %for itm in section.items:
                        <li><a href="${itm.link}">${itm.text}</a></li>
                    %endfor
                </ul>
            </div>
        </div>
    %endfor
</%def>
