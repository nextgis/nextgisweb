<%inherit file='../base.mako' />

<table style="width: 100%;">
	<thead>
		<tr>
			<th>Наименование</th>
			<th>Операции</th>
		</tr>
	</thead>
	<tbody>
	    %for obj in obj_list:
		    <tr>
				<td>
					<a href="${request.route_url('webmap.show', id=obj.id)}">${obj.display_name}</a>
				</td>
				<td>
					<a href="${request.route_url('webmap.display', id=obj.id)}">открыть</a>
					<a href="${request.route_url('webmap.edit', id=obj.id)}">редактировать</a>
				</td>
		    </tr>
	    %endfor
	</tbody>
</table>