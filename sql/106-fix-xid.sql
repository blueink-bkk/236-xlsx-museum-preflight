update tvec.files
	set xid = data->>'xid'
from tvec.pages
where (id = file_id)
--where (data->>'xid' = '3002')
;
