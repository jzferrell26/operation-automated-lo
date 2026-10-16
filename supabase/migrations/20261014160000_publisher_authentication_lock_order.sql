-- Keep original authentication current while a worker owns its lineage locks.
-- No table rewrite, new capability, membership, or permission relaxation.
set role migration_owner;

create or replace function campaign.webinar_publisher_resolve_authentication(
 wanted_operation text,wanted_actor uuid,wanted_location uuid
) returns jsonb
language plpgsql security definer set search_path='' as $f$
declare auth_row campaign.webinar_publisher_authentications; session_row platform.first_party_sessions;
begin
 select * into auth_row from campaign.webinar_publisher_authentications where location_id=wanted_location
  and operation_ref=wanted_operation and actor_id=wanted_actor;
 if not found or auth_row.expires_at<=clock_timestamp() then raise exception 'PUBLISHER_AUTHENTICATION_WITHDRAWN'; end if;
 session_row=campaign.webinar_publisher_authentication_session(wanted_location,wanted_actor,auth_row.session_id,auth_row.installation_id,auth_row.authentication_mode);
 if session_row.role_binding_id<>auth_row.role_binding_id or session_row.role_version<>auth_row.role_version
  or auth_row.expires_at>session_row.expires_at then raise exception 'PUBLISHER_AUTHENTICATION_WITHDRAWN'; end if;
 -- These identity fields are protected by the existing immutable-row triggers.
 -- Worker state and lease mutations cannot change them. Do not take another
 -- connection's lineage locks during the worker's pre-commit authority recheck.
 -- Current session, binding, actor, location and installation locks above remain.
 perform 1 from campaign.webinar_publisher_operations operation_row
  join campaign.webinar_publisher_launches launch_row on launch_row.location_id=operation_row.location_id
   and launch_row.projection_ref=operation_row.projection_ref
  where operation_row.location_id=wanted_location and operation_row.operation_ref=wanted_operation
   and operation_row.actor_id=wanted_actor and launch_row.actor_id=wanted_actor
   and launch_row.installation_id=auth_row.installation_id
   and (operation_row.operation->>'actorRoleVersion')::bigint=auth_row.role_version;
 if not found then raise exception 'PUBLISHER_AUTHENTICATION_WITHDRAWN'; end if;
 return jsonb_build_object('actorId',auth_row.actor_id,'locationId',auth_row.location_id,
  'installationId',auth_row.installation_id,'sessionId',auth_row.session_id,
  'role','location_admin','roleVersion',auth_row.role_version,'authenticationMode',auth_row.authentication_mode);
end $f$;

reset role;
