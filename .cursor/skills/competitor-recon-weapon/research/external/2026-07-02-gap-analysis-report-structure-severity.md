---
source_url: https://asana.com/resources/gap-analysis
retrieved_on: 2026-07-02
source_type: blog
authority: practitioner
relevance: high
topic: report-structure
weapon: competitor-recon-weapon
---

# Gap-analysis report structure and severity scoring (PRD input)

## Summary
The report-structure and severity-scoring conventions behind the weapon's gap-table output. Establishes the current-state / future-state / gap triad, and severity models that combine impact, exposure, and remediation complexity to produce a defensible ranked backlog. This is what turns raw findings into the phased build-order recommendation the internal Assistable doc ended with (P0 through P7).

## Key quotations / statistics
- Report triad: "a gap analysis has three parts: the current state (a defended metric), the future state (a target with a date and an assumption), and the gap itself -- read not as a number to close but as a signal about what's wrong upstream."
- Severity model: "scoring each gap by its regulatory severity, the operational or reputational exposure it creates if left open, and the complexity of the remediation required gives leadership a defensible basis for resourcing decisions."
- Ranked backlog: "scoring models that combine regulatory severity, control failure frequency, and business impact allow ... a ranked remediation backlog that is defensible to leadership."
- Prioritization axes for competitive gaps: "Impact ... Effort ... Competition difficulty ... Strategic fit."

## Annotations for weapon-forge
- Seed for `templates/gap-analysis-template.md` severity column and the phased-build-order section: score each gap by (impact x exposure) / remediation-effort, then bucket into phases (P0 hotfix ... Pn). The internal Assistable doc's P0-through-P7 ordering is the applied instance.
- Reinforces the generic gap-table schema from the Command Brief (surface / present-in-target / present-in-ours / severity / evidence-source / verification-state): "severity" here gets a defined scoring basis rather than a gut call.
- The "gap is a signal, not just a number" framing supports routing: recon surfaces and ranks; the decision of whether/when to close (strategy) is white-council-guardian's, and the PRD that closes it is library-guardian's.

## Sources
- https://asana.com/resources/gap-analysis
- https://www.clearpointstrategy.com/blog/gap-analysis-template
- https://www.metricstream.com/learn/compliance-gap-analysis.html
