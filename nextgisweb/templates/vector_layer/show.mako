<%inherit file="../layer/show.mako" />

<h2>Аттрибутивная информация</h2>

<table>
    <tr>
        <th>Поле</th>
        <th>Тип</th>
    </tr>

    %for field in obj.fields:
        <tr>
            <td>${field.keyname}</td>
            <td>${field.datatype}</td>
        </tr>
    %endfor
</table>