# Main flows and live-validation regression checks

## Initial workspace and incident selection

- Start: the existing incident app, explicitly labeled Simulation mode.
- Steps: open the workspace and select each of the three fictional incidents.
- Expect: matching title/site/category and separate conversations.

## Chat and retained context

- Steps: use Capture initial observations, Send observation, Enter, and Shift+Enter; add a second observation; refresh.
- Expect: labeled simulation advice, both observations retained, and an empty composer after success.

## Reviewed checks and activity

- Steps: mark a read-only check reviewed, unmark it, and mark it again; open Timeline.
- Expect: checkbox state and operator activity reflect the action. Reviewed does not mean passed.

## Operator workflow and handoff

- Steps: Begin triage with a note, Escalate incident, Prepare handoff, then Close incident with notes.
- Expect: explicit phase changes and recorded notes; handoff is selectable/copyable; closed incident is read-only.

## New incident and safety boundaries

- Steps: create a fictional incident, report smoke, then use a separate open incident to request an unapproved reboot.
- Expect: correct new metadata, stop-work guidance for the hazard, and refusal of unsafe requests.

## Dialogs, documentation, and mobile navigation

- Steps: open Architecture & limitations, follow the Cloudflare documentation link, close with button/Escape; resize desktop → 375px → desktop; use the mobile incident drawer and context tabs.
- Expect: documentation popup destination is Cloudflare; dialogs/drawers close; tabs, navigation, and composer remain usable without horizontal overflow.

## Requested change: real response compatibility

- Before edit: the real provider returned `result.response` as a JSON object and the adapter rejected it as invalid.
- Expect after edit: valid JSON text and parsed JSON objects both pass the same strict schema and curated-check filter.
- Variant matrix: valid object/text; null/array/non-JSON; forbidden phase fields; risky prose; provider failure.
- Real confirmation: at most three inference calls total across this validation session, including failed/diagnostic calls.
- Scope: actual adapter plus REST transport; not a deployed Worker/AI-binding or remote Durable Object test.
- Preview must remain labeled Simulation mode; do not silently enable credential-backed inference in the shared preview.
