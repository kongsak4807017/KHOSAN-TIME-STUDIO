# Community & Player Intelligence

## Purpose

Community Intelligence converts noisy player expression and behavior into evidence for experiments without allowing the loudest channel to steer the game automatically.

## Evidence classes

Keep these distinct:

### Stated feedback
Reviews, surveys, posts, comments, support tickets, interviews.

### Observed behavior
Session events, progression, churn points, deaths, routes, economy actions, social behavior.

### Created culture
Memes, guides, speedruns, mods, fan art, theories, role-play and unexpected player rituals.

### Market/cultural context
Adjacent games, genres, creator ecosystems and cultural signals.

## Insight record

Every insight must include:
- source/channel,
- collection period,
- population/sample if known,
- language/region if relevant,
- evidence class,
- observed theme,
- representative examples without overgeneralization,
- contradictory signals,
- uncertainty,
- proposed experiment or “no action”.

## Why + What

Telemetry normally says what happened.

KHOSAN should attempt to connect:

~~~text
What happened
   + where/when/who
   + stated feedback
   + session context
   -> plausible explanations
   -> experiment
~~~

A plausible explanation is not a fact until tested.

## Emerging fantasy

One of the highest-value outputs is detecting when players enjoy a fantasy different from the original framing.

Example:
- intended: monster hunter,
- observed community behavior: protecting and rebuilding villages,
- hypothesis: “village protector” may be the stronger fantasy,
- action: prototype an expanded restoration loop before rewriting the whole game.

## Community response levels

1. **Acknowledge** — players need communication, not a design change.
2. **Fix friction** — implementation problem; preserve vision.
3. **Experiment** — evidence suggests opportunity, uncertainty remains.
4. **Constitution review** — evidence challenges a locked creative premise; requires HG-01.
5. **Reject request** — incompatible with vision, safety, feasibility or evidence.

## Privacy and governance

Community/telemetry integrations must:
- collect only permitted data,
- minimize personal data,
- preserve source terms/consent constraints,
- document retention,
- aggregate when possible,
- never infer sensitive personal traits for game targeting.

## Live change rule

A community request must become a typed change/experiment work item before production agents implement it.
