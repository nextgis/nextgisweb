<% idx = 1 %>

%for result in results:

    <% flayer = result.feature_layer %>

    %for feature in result.features:
        <div style="margin-top: 1ex; font-size: 120%; background-color: #EEE;"> 
            <strong>${idx}.</strong>
            ${unicode(feature)}
            (<em>${result.keyname}</em>)
        </div>

        <table>          
            %for fld in flayer.fields:
                <tr>
                    <th style="text-align: left; color: #666;">${fld.display_name}</th>
                    <td>${feature.fields[fld.keyname]}</td>
                </tr>
            %endfor
        </table>

        <% idx += 1 %>

    %endfor

%endfor