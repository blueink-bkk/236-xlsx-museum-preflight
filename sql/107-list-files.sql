drop function if exists adoc.list_files cascade;

create function adoc.list_files(_path ltree)
  returns table(id integer, path ltree, xid varchar(1000), mtime timestamp) as $$

declare
begin
  return query
    select file.id, file.path, file.xid, file.mtime
    from adoc.file
    where (file.path <@ _path);
end;
$$ language plpgsql;

drop function if exists adoc.list_filex cascade;

create function adoc.list_filex(_path ltree)
  returns table(id integer, path ltree, xid varchar(1000), data jsonb,  mtime timestamp) as $$

declare
begin
  return query
    select file.id, file.path, file.xid, file.data, file.mtime
    from adoc.file
    where (file.path <@ _path);
end;
$$ language plpgsql;


-- select adoc.list_pages('museum.pdf','1908 Allez freres Section 1 20151026.pdf');
