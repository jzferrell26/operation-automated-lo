import assert from "node:assert/strict";
import { after, before, it } from "node:test";
import { randomUUID } from "node:crypto";
import { canonicalCampaignHash, webinarPublisherConfirmationHash } from "@oalo/application";
import { formatSessionRef, parseInstallationRef } from "@oalo/contracts";
import {
  PostgresWebinarPublisherCommandAuthenticationRepository,
  PostgresWebinarPublisherAuthenticationResolver,
  PostgresWebinarPublisherRepository,
} from "../dist/index.js";
import { publisherFixture } from "./webinar-publisher-fixture.mjs";
import {
  requiredTestDatabaseUrl,
  testPool,
  request,
  withMigrationOwnerTransaction,
  publisherAuthenticationCapabilities,
} from "./campaign-integration-support.mjs";
const url = requiredTestDatabaseUrl();
if (!/^\/oalo_test_[a-z0-9_]{1,40}$/u.test(new URL(url).pathname))
  throw new Error("Disposable oalo_test_ database required");
let restoreCapabilities;
before(async () => {
  restoreCapabilities = await publisherAuthenticationCapabilities();
});
after(async () => {
  await restoreCapabilities?.();
});

async function fixture(mode = "first_party", lifetimeSeconds = 3600) {
  const f = publisherFixture(),
    pool = testPool(url),
    session = randomUUID(),
    installation = parseInstallationRef(f.principal.installationRef);
  f.principal.authenticationMode = mode;
  f.principal.sessionId = formatSessionRef(session);
  let binding;
  const ownedBindings = [];
  async function admin(sql, values = []) {
    return withMigrationOwnerTransaction(pool, (c) =>
      c.execute(request("test.publisher-auth.admin", sql, values)),
    );
  }
  async function as(role, sql, values = []) {
    const c = await pool.connect();
    try {
      await c.execute(request("test.publisher-auth.begin", "begin"));
      await c.execute(request("test.publisher-auth.role", `set local role ${role}`));
      const r = await c.execute(request("test.publisher-auth.query", sql, values));
      await c.execute(request("test.publisher-auth.commit", "commit"));
      return r;
    } catch (e) {
      await c.execute(request("test.publisher-auth.rollback", "rollback"));
      throw e;
    } finally {
      await c.release();
    }
  }
  try {
    await admin(
      "insert into platform.locations(id,ghl_location_id,display_name,status) values($1::uuid,$2::text,'Publisher auth test','active')",
      [f.principal.locationId, f.summary.projection.assets.locationId],
    );
    await admin(
      "insert into platform.app_users(id,safe_display_name) values($1::uuid,'Publisher auth test')",
      [f.principal.actorId],
    );
    const b = await admin(
      "insert into platform.role_bindings(location_id,user_id,role) values($1::uuid,$2::uuid,'location_admin') returning id,(extract(epoch from granted_at)*1000000)::bigint::text as version",
      [f.principal.locationId, f.principal.actorId],
    );
    binding = b.rows[0].id;
    ownedBindings.push(binding);
    f.principal.roleVersion = Number(b.rows[0].version);
    f.operation.actorRoleVersion = f.principal.roleVersion;
    await admin(
      "insert into platform.marketplace_installations(id,location_id,marketplace_app_id,status) values($1::uuid,$2::uuid,'publisher-auth-test','active')",
      [installation, f.principal.locationId],
    );
    await admin(
      "insert into platform.first_party_sessions(id,session_secret_hash,location_id,user_id,role_binding_id,installation_id,session_role,role_version,issued_by,issued_at,expires_at,correlation_id) values($1::uuid,$2::text,$3::uuid,$4::uuid,$5::uuid,$6::uuid,'location_admin',$7::bigint,$8::text,clock_timestamp()-interval '10 minutes',clock_timestamp()+make_interval(secs=>$9::integer),'correlation_authfixture001')",
      [
        session,
        canonicalCampaignHash(randomUUID()),
        f.principal.locationId,
        f.principal.actorId,
        binding,
        installation,
        f.principal.roleVersion,
        mode === "embedded" ? "embedded_exchange" : "review_sign_in",
        lifetimeSeconds,
      ],
    );
    await admin(
      "insert into campaign.webinar_publisher_launches(location_id,projection_ref,actor_id,installation_id,campaign_ref,summary,projection_hash,summary_hash) values($1::uuid,$2::text,$3::uuid,$4::uuid,$5::text,$6::text::jsonb,$7::text,$8::text)",
      [
        f.principal.locationId,
        f.operation.projectionRef,
        f.principal.actorId,
        installation,
        f.summary.projection.campaignRef,
        JSON.stringify(f.summary),
        f.operation.projectionHash,
        f.operation.summaryHash,
      ],
    );
    f.operation.action = "cancel";
    f.task.action = "cancel";
    f.operation.confirmationHash = webinarPublisherConfirmationHash({
      action: "cancel",
      summary: f.summary,
      nativeIds: f.launch.nativeIds,
    });
    f.operation.requestHash = canonicalCampaignHash({
      requestId: f.operation.requestId,
      projectionRef: f.operation.projectionRef,
      expectedProjectionHash: f.operation.projectionHash,
      expectedRowVersion: 1,
      action: "cancel",
      confirmationHash: f.operation.confirmationHash,
    });
    const epoch = Number(
      (await admin("select floor(extract(epoch from clock_timestamp()))::integer as epoch")).rows[0]
        .epoch,
    );
    const candidate = {
      operationRef: f.operation.operationRef,
      principal: f.principal,
      authenticatedAt: new Date(epoch * 1000).toISOString(),
      expiresAt: new Date((epoch + 300) * 1000).toISOString(),
      verificationHash: "a".repeat(64),
    };
    const reservation = {
      projectionRef: f.operation.projectionRef,
      operation: f.operation,
      task: f.task,
      expectedRowVersion: 1,
      expectedState: "reserved",
    };
    // Synthetic independent verifier for SQL qualification only, not production provenance.
    const verifier = { verify: async () => candidate, assertCommandCurrent: async () => {} };
    const repository = new PostgresWebinarPublisherCommandAuthenticationRepository(pool, verifier),
      resolver = new PostgresWebinarPublisherAuthenticationResolver(pool);
    const identity = {
      operationRef: f.operation.operationRef,
      actorId: f.principal.actorId,
      locationId: f.principal.locationId,
    };
    const args = () => [
      f.principal.locationId,
      f.principal.actorId,
      session,
      installation,
      mode,
      candidate.authenticatedAt,
      candidate.expiresAt,
      candidate.verificationHash,
      JSON.stringify(reservation),
    ];
    const reserve = () =>
      repository.reserve({ reservation, authenticationEvidence: { testOnly: true } });
    return {
      f,
      pool,
      session,
      installation,
      binding,
      ownedBindings,
      admin,
      as,
      candidate,
      reservation,
      verifier,
      repository,
      resolver,
      identity,
      args,
      reserve,
      close,
    };
  } catch (e) {
    await close();
    throw e;
  }
  async function close() {
    try {
      await admin(
        "update platform.locations set status='deleted' where id=$1::uuid and ghl_location_id=$2::text",
        [f.principal.locationId, f.summary.projection.assets.locationId],
      );
      await admin(
        "update platform.app_users set status='deleted' where id=$1::uuid and safe_display_name='Publisher auth test'",
        [f.principal.actorId],
      );
      await admin(
        "update platform.marketplace_installations set status='revoked' where id=$1::uuid and location_id=$2::uuid",
        [installation, f.principal.locationId],
      );
      for (const ownedBinding of ownedBindings)
        await admin(
          "update platform.role_bindings set revoked_at=coalesce(revoked_at,clock_timestamp()) where id=$1::uuid and location_id=$2::uuid and user_id=$3::uuid",
          [ownedBinding, f.principal.locationId, f.principal.actorId],
        );
    } finally {
      await pool.close();
    }
  }
}
const reserveSql =
  "select campaign.webinar_publisher_authenticated_reserve($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text,$6::timestamptz,$7::timestamptz,$8::text,$9::text::jsonb) as value";
const resolveSql =
  "select campaign.webinar_publisher_resolve_authentication($1::text,$2::uuid,$3::uuid) as value";
it("worker reads revalidate original authentication on a separate connection while holding lineage locks", async () => {
  const x = await fixture();
  const authenticationPool = testPool(url);
  try {
    await x.reserve();
    const resolver = new PostgresWebinarPublisherAuthenticationResolver(authenticationPool);
    const connection = await x.pool.connect();
    const authenticationConnection = await authenticationPool.connect();
    try {
      const workerPid = await connection.execute(
        request("test.worker-pid", "select pg_backend_pid() as pid"),
      );
      const authPid = await authenticationConnection.execute(
        request("test.auth-pid", "select pg_backend_pid() as pid"),
      );
      assert.notEqual(workerPid.rows[0].pid, authPid.rows[0].pid);
    } finally {
      await authenticationConnection.release();
      await connection.release();
    }
    let rechecks = 0;
    const repository = new PostgresWebinarPublisherRepository(
      x.pool,
      {
        currentPrincipal: async () => {
          rechecks += 1;
          return resolver.current(x.identity);
        },
        assertEvidenceCurrent: async () => {
          throw new Error("unexpected evidence read");
        },
        assertDispatch: async () => {
          throw new Error("unexpected dispatch");
        },
        assertCheckpoint: async () => {
          throw new Error("unexpected checkpoint");
        },
      },
      x.f.operation.correlationRef,
    );
    const record = await repository.readWorker(x.f.principal, x.identity.operationRef);
    assert.equal(record.operation.operationRef, x.identity.operationRef);
    assert.equal(rechecks, 2);
    const claimed = await repository.claim(x.f.principal, {
      task: x.f.task,
      workerRef: "worker_authlock001",
      leaseSeconds: 30,
    });
    assert.equal(claimed.status, "leased");
    assert.equal(rechecks, 4);
    await assert.rejects(
      x.admin(
        "update campaign.webinar_publisher_operations set actor_id=$2::uuid where operation_ref=$1::text",
        [x.identity.operationRef, randomUUID()],
      ),
      /IMMUTABLE/u,
    );
    await assert.rejects(
      x.admin(
        "update campaign.webinar_publisher_operations set operation=jsonb_set(operation,'{actorRoleVersion}',to_jsonb(1)) where operation_ref=$1::text",
        [x.identity.operationRef],
      ),
      /IMMUTABLE/u,
    );
    await assert.rejects(
      x.admin(
        "update campaign.webinar_publisher_launches set installation_id=$2::uuid where projection_ref=$1::text",
        [x.f.operation.projectionRef, randomUUID()],
      ),
      /IMMUTABLE/u,
    );
    await x.admin(
      "select platform.revoke_first_party_session($1::uuid,'operator','correlation_authlocked001')",
      [x.session],
    );
    await assert.rejects(
      repository.readWorker(x.f.principal, x.identity.operationRef),
      /unavailable/u,
    );
  } finally {
    await authenticationPool.close();
    await x.close();
  }
});
it("atomically reserves original session provenance and exact replay, without retargeting login", async () => {
  const x = await fixture();
  try {
    await x.reserve();
    assert.deepEqual(await x.resolver.current(x.identity), x.f.principal);
    await x.reserve();
    const count = await x.admin(
      "select (select count(*) from campaign.webinar_publisher_authentications where location_id=$1::uuid)::integer as auth,(select count(*) from integration.webinar_publisher_outbox where location_id=$1::uuid)::integer as outbox",
      [x.identity.locationId],
    );
    assert.deepEqual(count.rows[0], { auth: 1, outbox: 1 });
    const original = x.candidate.principal;
    const newer = randomUUID();
    await x.admin(
      "insert into platform.first_party_sessions(id,session_secret_hash,location_id,user_id,role_binding_id,installation_id,session_role,role_version,issued_by,expires_at,correlation_id) values($1::uuid,$2::text,$3::uuid,$4::uuid,$5::uuid,$6::uuid,'location_admin',$7::bigint,'review_sign_in',clock_timestamp()+interval '1 hour','correlation_authnewer001')",
      [
        newer,
        canonicalCampaignHash(newer),
        x.identity.locationId,
        x.identity.actorId,
        x.binding,
        x.installation,
        original.roleVersion,
      ],
    );
    x.candidate.principal = { ...original, sessionId: formatSessionRef(newer) };
    await assert.rejects(x.reserve(), /unavailable/u);
    assert.equal((await x.resolver.current(x.identity)).sessionId, original.sessionId);
    await x.admin(
      "select platform.revoke_first_party_session($1::uuid,'operator','correlation_authrevoke001')",
      [x.session],
    );
    await assert.rejects(x.resolver.current(x.identity), /unavailable/u);
  } finally {
    await x.close();
  }
});
for (const withdrawal of ["installation", "binding", "actor", "location"])
  it(`current ${withdrawal} withdrawal denies original command`, async () => {
    const x = await fixture();
    try {
      await x.reserve();
      const queries = {
        installation: [
          "update platform.marketplace_installations set status='revoked' where id=$1::uuid",
          x.installation,
        ],
        binding: [
          "update platform.role_bindings set revoked_at=clock_timestamp() where id=$1::uuid",
          x.binding,
        ],
        actor: [
          "update platform.app_users set status='deleted' where id=$1::uuid",
          x.identity.actorId,
        ],
        location: [
          "update platform.locations set status='deleted' where id=$1::uuid",
          x.identity.locationId,
        ],
      };
      await x.admin(queries[withdrawal][0], [queries[withdrawal][1]]);
      await assert.rejects(x.resolver.current(x.identity), /unavailable/u);
    } finally {
      await x.close();
    }
  });
it("unknown operation, tenant and actor identities cannot borrow provenance", async () => {
  const x = await fixture();
  try {
    await x.reserve();
    for (const identity of [
      { ...x.identity, operationRef: "operation_missing001" },
      { ...x.identity, locationId: randomUUID() },
      { ...x.identity, actorId: randomUUID() },
    ])
      await assert.rejects(x.resolver.current(identity), /unavailable/u);
  } finally {
    await x.close();
  }
});
it("original embedded claim lifetime is retained and expired claims cannot adopt a later login", async () => {
  const x = await fixture("embedded");
  try {
    const epoch = Number(
      (await x.admin("select floor(extract(epoch from clock_timestamp()))::integer as epoch"))
        .rows[0].epoch,
    );
    x.candidate.authenticatedAt = new Date((epoch - 298) * 1000).toISOString();
    x.candidate.expiresAt = new Date((epoch + 2) * 1000).toISOString();
    await x.reserve();
    assert.equal((await x.resolver.current(x.identity)).authenticationMode, "embedded");
    const row = await x.admin(
      "select expires_at=($2::timestamptz) as exact from campaign.webinar_publisher_authentications where location_id=$1::uuid",
      [x.identity.locationId, x.candidate.expiresAt],
    );
    assert.equal(row.rows[0].exact, true);
    await x.admin(
      "select pg_sleep(greatest(0,extract(epoch from $1::timestamptz-clock_timestamp()))+0.02)",
      [x.candidate.expiresAt],
    );
    await assert.rejects(x.resolver.current(x.identity), /unavailable/u);
  } finally {
    await x.close();
  }
});
it("embedded issuer backing, original lifetime and installation linkage fail closed", async () => {
  const x = await fixture();
  try {
    let values = x.args();
    values[4] = "embedded";
    await assert.rejects(
      x.as("publisher_authentication_runtime", reserveSql, values),
      /WITHDRAWN/u,
    );
    values = x.args();
    values[3] = randomUUID();
    await assert.rejects(
      x.as("publisher_authentication_runtime", reserveSql, values),
      /WITHDRAWN/u,
    );
  } finally {
    await x.close();
  }
  const y = await fixture("embedded");
  try {
    y.candidate.expiresAt = new Date(
      Date.parse(y.candidate.authenticatedAt) + 301000,
    ).toISOString();
    await assert.rejects(y.reserve(), /unavailable/u);
  } finally {
    await y.close();
  }
});
it("missing original provenance cannot be retroactively attached to an old operation", async () => {
  const x = await fixture();
  try {
    await x.admin(
      "select platform.set_app_context($1::uuid,$2::uuid,'correlation_authlegacy001')",
      [x.identity.locationId, x.identity.actorId],
    );
    await x.admin(
      "insert into campaign.webinar_publisher_operations(location_id,operation_ref,projection_ref,actor_id,request_id,request_hash,operation,action,cancellation_generation) values($1::uuid,$2::text,$3::text,$4::uuid,$5::uuid,$6::text,$7::text::jsonb,'cancel',0)",
      [
        x.identity.locationId,
        x.identity.operationRef,
        x.f.operation.projectionRef,
        x.identity.actorId,
        x.f.operation.requestId,
        x.f.operation.requestHash,
        JSON.stringify(x.f.operation),
      ],
    );
    await assert.rejects(x.reserve(), /unavailable/u);
    await assert.rejects(x.resolver.current(x.identity), /unavailable/u);
  } finally {
    await x.close();
  }
});
it("a post-reservation independent refusal rolls back operation, outbox and authentication", async () => {
  const x = await fixture();
  try {
    let checks = 0;
    x.verifier.assertCommandCurrent = async () => {
      if (++checks === 2) throw new Error("test only current authority withdrawal");
    };
    await assert.rejects(x.reserve(), /unavailable/u);
    const r = await x.admin(
      "select (select count(*) from campaign.webinar_publisher_operations where location_id=$1::uuid)::integer as operation,(select count(*) from integration.webinar_publisher_outbox where location_id=$1::uuid)::integer as outbox,(select count(*) from campaign.webinar_publisher_authentications where location_id=$1::uuid)::integer as auth",
      [x.identity.locationId],
    );
    assert.deepEqual(r.rows[0], { operation: 0, outbox: 0, auth: 0 });
  } finally {
    await x.close();
  }
});
it("private capability grants, immutable identity and forced RLS deny ordinary runtime writes", async () => {
  const x = await fixture();
  try {
    await x.reserve();
    for (const role of ["app_runtime", "support_runtime", "publisher_admission_runtime"]) {
      await assert.rejects(x.as(role, reserveSql, x.args()), /permission denied/u);
      await assert.rejects(
        x.as(role, resolveSql, [
          x.identity.operationRef,
          x.identity.actorId,
          x.identity.locationId,
        ]),
        /permission denied/u,
      );
      await assert.rejects(
        x.as(role, "select * from campaign.webinar_publisher_authentications"),
        /permission denied/u,
      );
    }
    await assert.rejects(
      x.as("publisher_authentication_resolver", reserveSql, x.args()),
      /permission denied/u,
    );
    await assert.rejects(
      x.admin(
        "update campaign.webinar_publisher_authentications set session_id=$2::uuid where location_id=$1::uuid",
        [x.identity.locationId, randomUUID()],
      ),
      /immutable/u,
    );
    await assert.rejects(
      x.admin("delete from campaign.webinar_publisher_authentications where location_id=$1::uuid", [
        x.identity.locationId,
      ]),
      /immutable/u,
    );
    const r = await x.admin(
      "select relrowsecurity,relforcerowsecurity from pg_class where oid='campaign.webinar_publisher_authentications'::regclass",
    );
    assert.deepEqual(r.rows[0], { relrowsecurity: true, relforcerowsecurity: true });
    const roles = await x.admin(
      "select rolcanlogin,rolinherit,rolbypassrls from pg_roles where rolname in ('publisher_authentication_runtime','publisher_authentication_resolver')",
    );
    assert.equal(roles.rows.length, 2);
    for (const row of roles.rows)
      assert.deepEqual(row, { rolcanlogin: false, rolinherit: false, rolbypassrls: false });
  } finally {
    await x.close();
  }
});

it("original first-party expiry is rechecked without extending its persisted session", async () => {
  const x = await fixture("first_party", 3);
  try {
    await x.reserve();
    const r = await x.admin(
      "select session_row.expires_at=auth_row.expires_at as exact,session_row.expires_at from platform.first_party_sessions session_row join campaign.webinar_publisher_authentications auth_row on auth_row.session_id=session_row.id where session_row.id=$1::uuid",
      [x.session],
    );
    assert.equal(r.rows[0].exact, true);
    await x.admin(
      "select pg_sleep(greatest(0,extract(epoch from expires_at-clock_timestamp()))+0.02) from platform.first_party_sessions where id=$1::uuid",
      [x.session],
    );
    await assert.rejects(x.resolver.current(x.identity), /unavailable/u);
  } finally {
    await x.close();
  }
});

it("a replacement binding with the same version cannot stand in for the original binding", async () => {
  const x = await fixture();
  try {
    await x.reserve();
    await x.admin(
      "update platform.role_bindings set revoked_at=clock_timestamp() where id=$1::uuid",
      [x.binding],
    );
    const replacement = await x.admin(
      "insert into platform.role_bindings(location_id,user_id,role,granted_at) select location_id,user_id,role,granted_at from platform.role_bindings where id=$1::uuid returning id",
      [x.binding],
    );
    x.ownedBindings.push(replacement.rows[0].id);
    await assert.rejects(x.resolver.current(x.identity), /unavailable/u);
  } finally {
    await x.close();
  }
});

it("mutable caller context cannot acquire private authentication capabilities", async () => {
  const x = await fixture();
  try {
    await x.reserve();
    const c = await x.pool.connect();
    try {
      await c.execute(request("test.publisher-auth.guc-begin", "begin"));
      await c.execute(request("test.publisher-auth.guc-role", "set local role app_runtime"));
      await c.execute(
        request(
          "test.publisher-auth.guc-forge",
          "select set_config('app.location_id',$1::text,true),set_config('app.actor_id',$2::text,true),set_config('app.actor_type','user',true),set_config('app.support_grant_id','',true)",
          [x.identity.locationId, x.identity.actorId],
        ),
      );
      await assert.rejects(
        c.execute(
          request("test.publisher-auth.guc-deny", resolveSql, [
            x.identity.operationRef,
            x.identity.actorId,
            x.identity.locationId,
          ]),
        ),
        /permission denied/u,
      );
    } finally {
      await c.execute(request("test.publisher-auth.guc-rollback", "rollback"));
      await c.release();
    }
    const missing = await x.admin(
      "select count(*)::integer as missing from pg_constraint fk where fk.conrelid='campaign.webinar_publisher_authentications'::regclass and fk.contype='f' and not exists(select 1 from pg_index idx where idx.indrelid=fk.conrelid and idx.indisvalid and idx.indpred is null and (idx.indkey::smallint[])[0:cardinality(fk.conkey)-1]=fk.conkey)",
    );
    assert.equal(missing.rows[0].missing, 0);
  } finally {
    await x.close();
  }
});

it("independent backend reservations cannot attach competing session provenance", async (t) => {
  const x = await fixture(),
    secondPool = testPool(url);
  try {
    const engine = (await x.admin("select version() as engine")).rows[0].engine;
    if (/Emscripten/u.test(engine)) {
      t.skip(
        "Independent backend race requires native PostgreSQL; one-backend WASM cannot qualify it",
      );
      return;
    }
    // Qualify actual independent backends, not a one-backend WASM multiplexing model.
    const [firstConnection, secondConnection] = await Promise.all([
      x.pool.connect(),
      secondPool.connect(),
    ]);
    let independent;
    try {
      const [first, second] = await Promise.all([
        firstConnection.execute(
          request("test.publisher-auth.first-backend", "select pg_backend_pid() as pid"),
        ),
        secondConnection.execute(
          request("test.publisher-auth.second-backend", "select pg_backend_pid() as pid"),
        ),
      ]);
      independent = first.rows[0].pid !== second.rows[0].pid;
    } finally {
      await Promise.all([firstConnection.release(), secondConnection.release()]);
    }
    assert.equal(independent, true, "Native race must use two actual PostgreSQL backends");
    const newer = randomUUID();
    await x.admin(
      "insert into platform.first_party_sessions(id,session_secret_hash,location_id,user_id,role_binding_id,installation_id,session_role,role_version,issued_by,expires_at,correlation_id) values($1::uuid,$2::text,$3::uuid,$4::uuid,$5::uuid,$6::uuid,'location_admin',$7::bigint,'review_sign_in',clock_timestamp()+interval '1 hour','correlation_authrace001')",
      [
        newer,
        canonicalCampaignHash(newer),
        x.identity.locationId,
        x.identity.actorId,
        x.binding,
        x.installation,
        x.f.principal.roleVersion,
      ],
    );
    const competing = {
      ...x.candidate,
      principal: { ...x.f.principal, sessionId: formatSessionRef(newer) },
    };
    const secondRepository = new PostgresWebinarPublisherCommandAuthenticationRepository(
      secondPool,
      { verify: async () => competing, assertCommandCurrent: async () => {} },
    );
    const outcomes = await Promise.allSettled([
      x.reserve(),
      secondRepository.reserve({
        reservation: x.reservation,
        authenticationEvidence: { testOnly: true },
      }),
    ]);
    const successes = outcomes.flatMap((outcome, index) =>
      outcome.status === "fulfilled" ? [index] : [],
    );
    assert.equal(successes.length, 1);
    const principal = await x.resolver.current(x.identity);
    assert.equal(
      principal.sessionId,
      successes[0] === 0 ? x.f.principal.sessionId : competing.principal.sessionId,
    );
    const count = await x.admin(
      "select (select count(*) from campaign.webinar_publisher_authentications where location_id=$1::uuid)::integer as auth,(select count(*) from integration.webinar_publisher_outbox where location_id=$1::uuid)::integer as outbox",
      [x.identity.locationId],
    );
    assert.deepEqual(count.rows[0], { auth: 1, outbox: 1 });
  } finally {
    await secondPool.close();
    await x.close();
  }
});
