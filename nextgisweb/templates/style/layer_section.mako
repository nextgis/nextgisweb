<ul>
    %for style in obj.styles:
        <li>
            <a href="${style.permalink(request)}">${style.display_name}</a>
        </li>
    %endfor
</ul>
