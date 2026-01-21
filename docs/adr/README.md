# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the Garden project.

## What is an ADR?

An ADR is a document that captures an important architectural decision made along with its context and consequences.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [001](001-hexagonal-architecture.md) | Hexagonal Architecture | Accepted |
| [002](002-field-update-pattern.md) | FieldUpdate Pattern for Partial Updates | Accepted |

## Creating a New ADR

1. Copy the template below
2. Name it `NNN-title-with-dashes.md` (NNN = next number)
3. Fill in the sections
4. Add to the index above

## Template

```markdown
# ADR-NNN: Title

## Status

Proposed | Accepted | Deprecated | Superseded by [ADR-XXX](XXX-title.md)

## Date

YYYY-MM-DD

## Context

What is the issue that we're seeing that is motivating this decision?

## Decision

What is the change that we're proposing?

## Consequences

What becomes easier or more difficult to do because of this change?

### Positive
### Negative
### Neutral

## References

Links to relevant resources.
```
