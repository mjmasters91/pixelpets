-- Signed-out visitors may only call the read-only public RPCs.
-- (Already applied to production by the owner's assistant.)
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and p.proname not in ('get_companion','list_open_nest','list_companions_of','restock_shops','expire_trades')
  loop
    execute format('revoke execute on function %s from anon, public', r.sig);
  end loop;
end $$;
