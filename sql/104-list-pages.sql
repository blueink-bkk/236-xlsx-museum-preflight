drop function if exists adoc.list_pages cascade;

create function adoc.list_pages(_path ltree, _xid varchar(500))
  returns jsonb as $$

declare
  retv jsonb;
  pages integer[];
  xid text;
  file_id_ integer;
  lang text;
  data jsonb;
begin
  select
  	into xid, data, lang, file_id_
	file.xid, file.lang, file.data, file.id
  from adoc.file
  where path <= _path
  and xid = _xid;

  pages := ARRAY(select pageno
  from adoc.page., adoc.file
  where (id = file_id)
  and (path <@ _path)
  and (filename = _filename)
  );

  retv := json_build_object(
	  'lang', lang,
	  'xid',xid,
	  'pages',pages,
	  'file_id', file_id_
  );
  return retv;
end

$$ language plpgsql;


-- select adoc.list_pages('museum.pdf','1908 Allez freres Section 1 20151026.pdf');
