-- Feb 13, 2020
-- based on 2018/sql-project/repo2/create-table-pdf-file.sql
-- Why do we need data:jsonb in pdf-page ?
-- fiches musee => only 1 page en format yaml/MD
-- blueink co.th => fiches and pdf-files


create schema if not exists adoc;
create extension if not exists ltree;
create extension if not exists plv8;
create table if not exists adoc.file (
  id serial primary key,
  path ltree,      -- museum.pdf, jpc, blueink, etc....
  xid varchar(1000), -- filename or reference to an external ID
--  filename text not null, -- ex: 'https://www.costco.com/laptops
  lang text default 'fr',
  data jsonb, -- pour les fiches du musee et articles du dico.
  mtime timestamp,
  unique (path, xid)
);

create table if not exists adoc.page (
  file_id integer references adoc.file(id) on delete cascade,
  pageno integer not null,
  -- p2 : another ltree for url to avoid too many files...
  -- ex: path: 'https://www.costco.com/
  --     cat: lg-gram-15-touchscreen-laptop---intel-core-i7---1080p.product
  --     .100408465.html'
  raw_text text,
  tsv tsvector,
  unique (file_id, pageno)
);

-- new_file (path, filename, lang)
drop function if exists adoc.new_file(ltree, text, text)  cascade;
drop function if exists adoc.new_file(text, text, text)  cascade;

create function adoc.new_file(__path text, _xid text, _lang text default 'fr'::text) returns integer
    LANGUAGE plpgsql
    AS $$
declare
  _path ltree := __path;
	iret integer := -1;
begin
	select id into iret
	from adoc.file as f where (f.xid = _xid) and (f.path = _path);

  raise notice 'new_file(1)(p:%, xid:%) => iret:%', _path, _xid, iret;
	if iret is null then
		insert into adoc.file (path, xid, lang) values(_path, _xid,_lang) returning id into iret;
	end if;
raise notice 'new_file(1)(p:%, xid:%) => iret:%', _path, _xid, iret;
return iret;
end;
$$;



drop function if exists adoc.commit_file(ltree, text, jsonb, text)  cascade;

create function adoc.commit_file(_path ltree, _xid text, _data jsonb, _lang text default 'fr'::text) returns integer
    LANGUAGE plpgsql
    AS $$
declare
	iret integer := -1;
  row_count integer := 0;
  v_cnt integer := 0;
  retv integer;
begin
--	select id into iret

  insert into adoc.file (path,xid,data,lang,mtime)
  select _path, _xid, _data, _lang, now();

  raise notice 'adoc.commit_page now: %', now();

  select id from adoc.file where (path = _path) and (xid = _xid) into retv;
--return row_count;
  return retv;


  exception
  	when unique_violation then begin
		raise notice 'adoc.commit_page unique violation -> Updating instead:';
--    raise notice 'file-id:% p:%', _file_id, _pageno;

    raise notice 'adoc.commit_page now: %', now();

		update adoc.file f
		set (data,lang,mtime) = (_data,_lang, now())
		where (f.path = _path) and (f.xid = _xid);
    get diagnostics row_count = row_count;
    raise notice 'adoc.commit_page row_count:%', row_count;
    raise notice 'adoc.commit_page data:%', _data;
	end;


  select id from adoc.file where (path = _path) and (xid = _xid) into retv;
--return row_count;
  return retv;
end;
$$;


drop function if exists adoc.new_file(ltree, text, jsonb, text)  cascade;

create function adoc.new_file(_path ltree, _xid text, _data jsonb, _lang text default 'fr'::text) returns integer
    LANGUAGE plpgsql
    AS $$
declare
	iret integer := -1;
begin
	select id into iret
	from adoc.file as f where (f.xid = _xid) and (f.path = _path);

  raise notice 'new_file(1)(p:%, xid:%) => iret:%', _path, _xid, iret;
	if iret is null then
		insert into adoc.file (path, xid, data, lang) values(_path, _xid, _data, _lang) returning id into iret;
	end if;
raise notice 'new_file(1)(p:%, xid:%) => iret:%', _path, _xid, iret;
return iret;
end;
$$;




drop function if exists adoc.write_page cascade;

create function adoc.write_page(_path text, _xid text, _pageno integer, _raw_text text) returns void
    LANGUAGE plpgsql
    AS $$
declare
  _file_id integer;
  path ltree := _path;
--  _pageno integer := pageno;
--  _raw_text text := raw_text;
--  _data jsonb := data;
  _tsv tsvector;
begin
  if (_xid is null) then
      raise exception 'Missing XID';
	else
	  _file_id := adoc.new_file(_path, _xid, 'fr');
  end if;
  raise notice 'file-id:%', _file_id;

  --if (id is null) then
  --    raise exception 'Fatal error pdf file not found pdf:id:%',id;
  --end if;

  raise notice 'Processing raw_text for %::%', _xid, _pageno;

  insert into adoc.page (file_id, pageno, raw_text)
  select _file_id, _pageno, _raw_text;

  exception
  	when unique_violation then begin
		  raise notice 'write_page unique violation -> Updating instead:';
		  update adoc.page p
		  set raw_text = _raw_text
		  where p.file_id = _file_id and p.pageno = _pageno; -- unique
	  end;

end;
$$;


drop function if exists adoc.write_pagex cascade;

create function adoc.write_pagex(_path text, _xid text, _pageno integer, _data jsonb, _raw_text text) returns void
    LANGUAGE plpgsql
    AS $$
declare
  _file_id integer;
  path ltree := _path;
--  _pageno integer := pageno;
--  _raw_text text := raw_text;
--  _data jsonb := data;
  _tsv tsvector;
begin
--  if (filename is null) then
--      raise exception 'Missing filename';
--  end if;

  if (_xid is null) then
      raise exception 'Missing XID';
  end if;

	_file_id := adoc.commit_file(path, _xid, _data, 'fr');
  raise notice 'adoc.write_pagex =>file-id:%', _file_id;

  --if (id is null) then
  --    raise exception 'Fatal error pdf file not found pdf:id:%',id;
  --end if;

  raise notice 'adoc.write_pagex Processing raw_text xid:%::%', _xid, _pageno;

  insert into adoc.page (file_id, pageno, raw_text)
  select _file_id, _pageno, _raw_text;
  exception
  	when unique_violation then begin
		raise notice 'adoc.write_pagex unique violation -> Updating instead:';
    raise notice 'file-id:% p:%', _file_id, _pageno;
    -----------------------------------------------------
    _file_id := adoc.commit_file(path, _xid, _data, 'fr');
    ------------------------------------------------------
    -- not perfect but ok for now.
		update adoc.page p
		set raw_text = _raw_text
		where (p.file_id = _file_id) and (p.pageno = _pageno);
	end;

end;
$$;


drop function if exists adoc.page_vector_update cascade;

create function adoc.page_vector_update() returns trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        new.tsv = to_tsvector('pg_catalog.french', COALESCE(NEW.raw_text, ''));
    END IF;
    IF TG_OP = 'UPDATE' THEN
        --IF NEW.raw_text <> OLD.raw_text THEN
            new.tsv = to_tsvector('pg_catalog.french', COALESCE(NEW.raw_text, ''));
        --END IF;
    END IF;
    RETURN NEW;
END
$$;

drop trigger if exists tsvector_update on adoc.page;

create trigger tsvector_update BEFORE INSERT OR UPDATE ON adoc.page FOR EACH ROW EXECUTE PROCEDURE tsvector_update_trigger('tsv', 'pg_catalog.french', 'raw_text');


drop function if exists adoc.search_pages_rank_cd2 cascade;

create function adoc.search_pages_rank_cd2(
        in _path ltree,
        in _query text)
    returns table(
      id integer,
--      tsv tsvector, -- do we need this ?
      rank real,
      fragments text,
      data jsonb,        -- for external/client ID.
      path ltree,      -- actual path where the page was found
      xid text,         --
      pageno integer   -- ignored for web-pages
    ) LANGUAGE sql
    AS $$

	with X as ( select
    tsv,
    path,
		file_id,
    xid,
		pageNo,
    data,
		raw_text, -- for ts_headline but not exposed in return table.
    ts_rank_cd(tsv,qqq) as rank
    from adoc.page,
      adoc.file,
      to_tsquery('french', _query) as qqq
    where (file.id = file_id)
    and (path <@ _path) -- children
    and (tsv @@ qqq)
    ORDER BY rank DESC
    LIMIT 500
	)
	select -- in exact order "return as"
    file_id,
--    tsv,
    rank,
    ts_headline('french', raw_text,
        to_tsquery('french', _query),
        'StartSel ="<em>", StopSel ="</em>", MaxWords = 50, MinWords = 19, HighlightAll = false, MaxFragments = 99, FragmentDelimiter = "\n<!>"')
       as fragments,
    data,
    path, xid, pageno
--    data
	from X
--	join files on (X.file_id = file.id)
  order by rank desc, xid, pageno
$$;


/*
drop function if exists adoc.remove_pages(ltree, text);

create or replace function adoc.remove_pages(_path ltree, _xid text) returns void as $$
declare
  _file_id integer;
begin
  select f.id into _file_id
  from adoc.file f where f.xid = _xid and f.path = _path;

  raise notice 'found file(%)(%)=>%',_path, _xid, _file_id;
  delete from adoc.page where adoc.page.file_id = _file_id;
end;
$$ language plpgsql;
*/



drop function if exists adoc.remove_xid(ltree, text);

create or replace function adoc.remove_xid(_path ltree, _xid text) returns void as $$
declare
begin
  delete from adoc.file where path = _path and xid = _xid;
end;
$$ language plpgsql;
