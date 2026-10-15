-- Test helpers (scratch database only). Run by the runner as the superuser, once, after the fixture.
-- Every test chunk runs inside BEGIN ... ROLLBACK, so nothing persists between chunks.

create schema test;

-- Run p_sql, optionally AS a database role with a JWT subject, and check the outcome.
--   p_expected = NULL  -> must succeed
--   p_expected = '*'   -> must fail with any error
--   p_expected = '?'   -> may succeed or fail (the test then asserts the resulting state)
--   p_expected = '42501' etc. -> must fail with exactly that SQLSTATE
--   p_msg_like         -> optional LIKE pattern the error message must match
-- The statement runs in a sub-transaction, so a failure leaves earlier chunk state untouched.
create function test.expect(
  p_label text, p_sql text, p_expected text default null,
  p_role text default null, p_uid uuid default null, p_msg_like text default null
) returns void language plpgsql as $$
declare
  v_state text; v_msg text; v_ok boolean := false;
begin
  begin
    if p_role is not null then
      perform set_config('request.jwt.claims',
        case when p_uid is null then json_build_object('role', p_role)::text
             else json_build_object('sub', p_uid, 'role', p_role)::text end, true);
      execute format('set local role %I', p_role);
    end if;
    execute p_sql;
    v_ok := true;
  exception when others then
    get stacked diagnostics v_msg = message_text;
    v_state := sqlstate;
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  if p_expected = '?' then
    null;
  elsif p_expected is null then
    if not v_ok then raise exception 'FAIL [%]: expected success, got % (%)', p_label, v_state, v_msg; end if;
  else
    if v_ok then raise exception 'FAIL [%]: expected error %, but it succeeded', p_label, p_expected; end if;
    if p_expected <> '*' and v_state <> p_expected then
      raise exception 'FAIL [%]: expected %, got % (%)', p_label, p_expected, v_state, v_msg;
    end if;
    if p_msg_like is not null and v_msg not like p_msg_like then
      raise exception 'FAIL [%]: error message "%" does not match %', p_label, v_msg, p_msg_like;
    end if;
  end if;
  raise notice 'PASS [%]', p_label;
end $$;

-- Evaluate a boolean query as the superuser and require it to be true.
create function test.assert(p_label text, p_sql text) returns void language plpgsql as $$
declare v boolean;
begin
  execute p_sql into v;
  if v is distinct from true then raise exception 'FAIL [%]: assertion false: %', p_label, p_sql; end if;
  raise notice 'PASS [%]', p_label;
end $$;

-- Evaluate a scalar query AS a role (so RLS applies) and return it as text.
create function test.scalar_as(p_role text, p_uid uuid, p_sql text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then json_build_object('role', p_role)::text
         else json_build_object('sub', p_uid, 'role', p_role)::text end, true);
  execute format('set local role %I', p_role);
  execute p_sql into v;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return v;
exception when others then
  reset role;
  perform set_config('request.jwt.claims', '', true);
  raise;
end $$;
