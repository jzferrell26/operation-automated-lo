# Pillar 5: AI & Cognitive Systems

## CRITICAL DIRECTIVES

Before acting in this domain you MUST load these skills via the Skill tool:

- `mind-weapon`: owns the cognitive layer of the deploying product itself: coach/agent routing, the prompt cascade, RAG/GraphRAG, three-tier memory, observability and evaluation.
- `ai-tools-platform-weapon`: owns the infrastructure choices underneath any AI feature: gateways (Portkey, OpenRouter), cloud providers (Bedrock, Vertex AI), frontier model selection, local LLMs, GPU cloud, and MCP server selection.
- `hivemind-weapon`: owns the cross-session, cross-harness AI memory layer (`@deeplake/hivemind`) that persists context between separate agent sessions, distinct from the in-product memory `mind-weapon` designs.

---

## What this pillar collectively knows

This is the smallest pillar in the corpus by weapon count but covers three genuinely distinct layers that are easy to conflate: **the product's own AI feature architecture** (what the app does with AI, owned by `mind-weapon`), **the infrastructure choices that power any AI call** (which model, which gateway, which fallback route, owned by `ai-tools-platform-weapon`), and **the operator's own cross-session memory** (what the agent building the product remembers between sessions, owned by `hivemind-weapon`). The first two are about the product being built; the third is about the tooling used to build it.

### Disambiguation table

| Situation | Weapon that owns it | Not this one |
|---|---|---|
| Coach routing, prompt cascade, RAG/GraphRAG, AiTrace observability in the app | `mind-weapon` | `ai-tools-platform-weapon` (infra underneath, not the feature architecture) |
| Which model/gateway/provider to call, cost optimization, local LLM fallback | `ai-tools-platform-weapon` | `mind-weapon` (assumes a provider is already chosen) |
| Recalling what an agent did in a previous session, saving cross-harness memory | `hivemind-weapon` | `mind-weapon` (product-facing memory, not operator/agent memory) |
| Prompt-injection or PII-in-traces security audit | escalates to Pillar 3 `security-weapon` | `mind-weapon` (surfaces the concern, does not own the audit) |

### Canonical multi-weapon sequences

1. **AI cognitive feature build:** `ai-tools-platform-weapon` decides the model/gateway/fallback stack → `mind-weapon` designs or extends the cognitive layer on top of it (coach routing, prompt cascade, retrieval) → Pillar 2's `python-weapon` implements it if the cognitive code lives in Django/FastAPI/Celery → Pillar 3's security-then-quality loop audits prompt-injection surface, PII in traces, and secret handling, then verifies against the plan.
2. **Operator memory discipline (runs alongside, not inside, product work):** `hivemind-weapon` is invoked proactively as the recall-before / persist-after step surrounding other weapons' work, not as a step inside the AI feature build itself.

### Load-bearing hard rules and gotchas

- **Every AI call in the product should be traced** per `mind-weapon`'s "every-call-traced" rule — an untraced LLM call is a debugging blind spot, not an acceptable optimization.
- **`hivemind-weapon` uploads session content to the cloud.** Never persist client PII, secrets, or credentials through it; this is a hard boundary, not a configurable setting.
- **`ai-tools-platform-weapon` treats cheap-fallback routing (Haiku/Mini/Flash) as a cost-control default**, not an afterthought — a production AI feature without a fallback tier is treated as an incomplete cost design.
- **Prompt-injection and PII-in-traces are security concerns `mind-weapon` surfaces but does not own the audit for** — always hand off to Pillar 3's `security-weapon` rather than treating a `mind-weapon` review as a substitute for a security pass.

---

## Cross-references to sibling pillars

- Security audit of the AI surface (prompt injection, key handling, PII in traces) is **Pillar 3: Security, Quality & Code Review**.
- The Python/Django implementation of cognitive-layer code lives in **Pillar 2: Backend, Data & APIs**.
- Chat/voice UI components consuming the cognitive layer are **Pillar 1: Frontend & Design Systems**.
- AI feature PRD authorship is **Pillar 7: Product Process & Documentation** (`library-weapon`).
