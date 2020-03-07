select plv8_version();
select count(8) from adoc.page
join adoc.file on (file_id = id)
where path <@ 'museum';

select count(*) from adoc.page, adoc.file
where (file_id = id) and (path <@ 'museum.yaml');

select min(adoc.file.data->>'yp') from adoc.file, adoc.page
where (file_id = id) and (path <@ 'museum.yaml');
/*
select
   data->'titres' as titles,
   data->'links' as links,
   data->>'yp' as yp,
   (data->>'transcription')::boolean as transcription,
   (data->>'restricted')::boolean as restricted,
   data->>'xid' as xid,
   data->'mk' as mk,
   data->>'sec' as sec
from adoc.page, adoc.file
where (file_id = id) and (path <@ 'museum.yaml')
and (data->>'sec' != '3')
and (data->>'mk' is not null);
*/


DO $$
-- declare
BEGIN
--  /* pl/pgsql here */
END $$;

do $$
const x =1;
const o= plv8.execute('select count(*) from adoc.page;')[0];
plv8.elog(NOTICE, JSON.stringify(o))
plv8.elog(NOTICE, o.count)
return 1;
$$ language plv8;
