# Mimosa sealed scan contract

## Canonical artifacts

Each scan directory contains four semantic JSON documents and one derived Markdown projection:

| File | Role |
| --- | --- |
| `scan-manifest.json` | Scan identity, project fingerprint, requested depth, timestamps, engine version, and artifact names |
| `findings.json` | Normalized deterministic findings and business-logic candidates |
| `coverage.json` | Per-phase status, limitations, and deferred work |
| `seal.json` | SHA-256 digests of the three semantic documents |
| `report.md` | Human-readable projection; it is not part of the semantic seal |

The seal detects local artifact mutation. It is not a digital signature, publisher identity, runtime attestation, or proof that the desktop host loaded a particular release.

Outputs must live outside the scanned repository. The default history root is `~/.mimosa/security-scans/<project-id>`.

## Background job contract

`security_scan_start` returns a persistent `jobId` immediately. Use
`security_scan_status` to observe one of `running`, `cancel_requested`,
`completed`, `failed`, `cancelled`, or `interrupted` without occupying a long
host tool-call window.

Cancellation is cooperative and prevents an unsealed attempt from being
reported as complete. `resume` is deliberately `restart-unsealed-attempt`: it
keeps the same job ID, increments `attempt`, and reruns the immutable request.
It is not a phase checkpoint and does not promote partial output to coverage.

On `completed`, consume the returned scan ID, seal and coverage as the
authoritative scan receipt.

## Five review phases

1. `threatModel`: repository structure, entry points, assets, actors, and trust boundaries.
2. `findingDiscovery`: deterministic rules, dependency facts, cross-file facts, and business-logic hypotheses.
3. `validation`: static counterevidence and candidate state convergence.
4. `pathAnalysis`: call/value-path support and explicit proof gaps.
5. `reporting`: normalized artifacts and the Markdown projection.

A `partial` or `failed` phase prevents a whole-project safety claim.

## Business-logic states

- `vulnerable`: current static evidence supports the candidate, but `verdictEffect` remains `none` until the product adopts a separate reviewed policy.
- `safe`: static counterevidence disproves this candidate in the examined scope.
- `shadow`: the candidate belongs to an unreachable, sample, generated, test, or other non-effective path.
- `needs_runtime`: static analysis cannot prove the required property; runtime verification remains separately authorized.
- `inconclusive`: evidence is missing, contradictory, or below the deterministic confidence floor.

## Comparison

`security-scan compare` reports new, persistent, and resolved normalized finding identities. If either scan has incomplete coverage, absence is reported as `unknown` rather than automatically treated as resolved.
