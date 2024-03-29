<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
    <title>${resource.display_name}</title>
    <meta http-equiv="content-type" content="text/html; charset=utf-8" />
</head><body>

%for idx, result in enumerate(results, start=1):
    <% flayer = result['feature_layer'] %>

    %for feature in result['features']:
        <div style="margin-top: 1ex; font-size: 120%; background-color: #EEE;"> 
            <strong>${idx}.</strong>
            ${feature.label}
            (<em>${result['keyname']}</em>)
        </div>

        <table>          
            %for fld in flayer.fields:
                <tr>
                    <th style="text-align: left; color: #666;">${fld.display_name}</th>
                    <td>${feature.fields[fld.keyname]}</td>
                </tr>
            %endfor
        </table>
    %endfor
%endfor

</body></html>
