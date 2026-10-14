import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import * as db from "@oalo/db";
import * as app from "@oalo/application";
import { runFinancingReleaseAdapterCases } from "../../../packages/db/test/financing-release-repository.unit-cases.mjs";

// Run the exact adapter/crypto cases against source modules for the unchanged coverage gate.
// The node package runner runs the same cases against its actual compiled exports.
runFinancingReleaseAdapterCases(db, app, { describe, it });
const migrationPath = "supabase/migrations/20261014051000_financing_release.sql";
describe("public financing migration SQL contract", () => {
  it("binds serialized JSON as text before PostgreSQL casts it, preventing driver double encoding", () => {
    const slots = {
      sourceSave: [1],
      current: [1],
      save: [1],
      admit: [3, 4],
    } as const;
    for (const [name, parameters] of Object.entries(slots)) {
      const sql = db.financingReleaseSqlContracts[name as keyof typeof slots].text;
      for (const parameter of parameters) expect(sql).toContain(`$${parameter}::text::jsonb`);
    }
  });
  it("binds anonymous SQL reads to a protected backend/transaction scope, regardless of mutable GUCs", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("create table campaign.financing_release_public_scopes");
    expect(sql).toContain("pg_current_xact_id()");
    expect(sql).toContain("pg_backend_pid()");
    expect(sql).toContain("current_setting('role',true)='financing_public_runtime'");
    expect(sql).not.toContain(
      "coalesce(current_setting('app.financing_public_release',true),'')<>''",
    );
    expect(sql).toContain("campaign.financing_release_public_scope()");
    expect(sql).toContain("deferrable initially deferred");
  });
  it("has only the reserved additive migration and indexes every new foreign key", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).not.toMatch(/\b(?:drop\s+table|alter\s+column|truncate)\b/iu);
    for (const index of [
      "financing_release_source_evidence_ref_idx",
      "financing_releases_owner_idx",
      "financing_releases_source_idx",
      "financing_release_operations_release_idx",
      "financing_release_inquiries_release_idx",
      "financing_release_inquiries_publication_idx",
      "financing_release_delivery_release_idx",
    ])
      expect(sql).toContain(`create index ${index}`);
    expect(sql).toContain("unique(location_id,campaign_version_ref,evidence_hash)");
  });
  it("locks source and evidence records, uses server clock and exact source identity rather than caller booleans", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("row.evidence<>member.proof");
    expect(sql).toContain("row.revoked_at is not null");
    expect(sql).toContain("row.expires_at<=t");
    expect(sql).toContain("v.manifest<>source_version->'manifest'");
    expect(sql).toContain("v.created_by_actor_ref<>source_version->>'createdBy'");
    expect(sql).toContain("for share");
    expect(sql).toContain("for update");
  });
  it("has explicit transaction/dedupe/CAS and ciphertext lifetime checks", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("existing.content_hash<>wanted_hash");
    expect(sql).toContain("existing.revision<>wanted_revision");
    expect(sql).toContain("existing.record->'snapshot'<>snapshot");
    expect(sql).toContain("previous.request_hash<>wanted_hash");
    expect(sql).toContain("expires_at=accepted_at+interval '30 days'");
    expect(sql).not.toMatch(/\b(?:first_name|email|phone|mortgage_balance)\s+text/iu);
  });
  it("preserves bounded latest export, daily purge consumer hook and non-PII tombstone", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain("order by item.accepted_at desc,item.inquiry_id desc limit 1000");
    expect(sql).toContain(
      "expires_at<=clock_timestamp() order by expires_at limit 5000 for update skip locked",
    );
    expect(sql).toContain("create function campaign.purge_expired_financing_inquiries()");
    expect(sql).toContain(
      "grant execute on function campaign.purge_expired_financing_inquiries() to scheduler_runtime",
    );
    expect(sql).toContain("A removed or purged request never re-creates PII");
  });
  it("keeps anonymous and verification service roles finite and separate from private command authority", async () => {
    const sql = await readFile(migrationPath, "utf8");
    expect(sql).toContain(
      "create role financing_public_runtime nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls",
    );
    expect(sql).toContain(
      "create role financing_verifier_runtime nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls",
    );
    expect(sql).not.toMatch(/grant[^;]*financing_verifier_runtime[^;]*to\s+app_runtime/iu);
    expect(sql).toContain(
      "grant execute on function campaign.financing_release_admit_evidence(uuid,text,jsonb,jsonb) to financing_verifier_runtime",
    );
    expect(sql).toContain(
      "('financing_release_publication','financing_release_public_context','financing_release_source','financing_release_load','financing_release_current','financing_release_capture')",
    );
  });
});
