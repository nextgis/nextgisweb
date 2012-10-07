<%inherit file="../layer/show.mako" />

<h2>Аттрибутивная информация</h2>

<table>
    <tr>
        <th>Поле</th>
        <th>Тип</th>
    </tr>

    %for field in obj.fields:
        <tr>
            <td>${field.name}</td>
            <td>${field.ftype}</td>
        </tr>
    %endfor
</table>