

drop function if exists adoc.remove_path(ltree);

create or replace function adoc.remove_path(_path ltree) returns void as $$
declare
begin
  delete from adoc.file where path = _path;
end;
$$ language plpgsql;
