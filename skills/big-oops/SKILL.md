---
name: big-oops
description: >-
  Model data as structs a system can see, and operations as verbs. Use when
  object-oriented design comes up, a class, a subclass, an interface, a method
  on an entity, or the big oops; when designing a record, schema, or JSON
  shape; when adding a stage or transform to a pipeline; or when another skill
  needs this vocabulary.
---

# Big OOPs

A **struct** is a layout you can see. A **verb** is a function named for the
transform. The **capsule** sits around the **system** (the hard problem). The user's
mental model stays in the experience. The record in memory is whatever the
code needs.

Depth of the system's interface is [`codebase-design`](../codebase-design/SKILL.md).
This skill decides what lives inside.

## The mistake

The mistake is a compile-time hierarchy that copies the domain, with the wall
around each noun. Casey Muratori, *The Big OOPs: Anatomy of a Thirty-five-year
Mistake*, Better Software Conference 2025.
https://www.youtube.com/watch?v=wo84LFzx5nI

A noun becomes a class, the class grows methods, and kinds become subclasses.
The fields sit behind the noun. The system that must read across records has
to ask each object. This skill treats that placement as a design failure. The
wall stays. It moves onto the system, which can see every record it transforms.

Sketchpad's constraint solver could walk every variable it constrained.
Looking Glass stored an entity as an id and let the system own the fields,
`hit_points.get(id)`. Alan Kay called that visibility omniscience and treated
it as a flaw. The operations that need the data are the ones the wall blocks.

A method on a record fits when the call never reads another record. When the
call must read another record, the verb belongs to the system and the fields
stay on the struct.

Write that cross-record verb first. The single-record call can be a path
inside it.

The record stays a visible struct. The behaviour is a verb the system owns. A
kind is a tag or a flag on the struct, and the verb switches on it.

| The reflex | What we write |
| --- | --- |
| `class Shot` with methods | a `Shot` struct, verbs in the shot system |
| `shot.render()` | `render_shot(shot, cfg)` |
| `class CloseUp(Shot)` | a `kind` tag on `Shot`, switched in the verb |
| an interface per noun | one capsule around the system |
| a getter | the system reads the field |

Classes are not banned. A class that is a struct with a constructor is fine, and
so is one wrapping a system. The line is methods that hide fields the system
needs to see: once a caller has to ask the entity, the system stops being able
to look.

## 1. Name the system

The hard problem this change serves. One name: render, compile, clip, physics.
That cluster of verbs is the capsule.

Done: the system is named, and you can say what it reads and what it writes.

## 2. Lay out the structs

Records the system must see. Fields are on the record. An entity is an id, or
one fat struct with a kind or flags. The system looks the fields up. It does
not ask the entity for a method.

Done: every field the verb needs is on a struct the system can read.

## 3. Write the verb

A function named for the operation. It takes the structs, or an id plus the
system's tables. Ask the system, not the entity: `hit_points.get(id)`,
`apply_prompt(workflow, text)`, `compile_shot(shot, cfg)`.

Done: the new behaviour is a function a caller finds by the verb.

## 4. Variants

| The data is | Use |
| --- | --- |
| mutually exclusive kinds | tagged union and a switch, or a table |
| mixable capabilities | flags, or a table per capability |

You add verbs more often than kinds, so the operations stay together. A new
kind is a tag or a flag, not a subclass.

Done: each variant is one of those two.

## Capsule

**Encapsulation** is the wall. Place it with intent around the system that
solves the hard problem. That system is omniscient: it can see the pieces.
A multi-select, a constraint pass, a compile that must unify blocks across
shots, needs that view.

Unusual placement is fine when it buys leverage and does not cut the hard
problem in half. A one-size is-a tree is not a placement.

Done: the wall is around the system you named in step 1.

## Terms

Use these. They are the vocabulary.

**system.** A cluster of verbs that own one hard problem. The capsule goes
here.

**struct.** A visible record. Fields, maybe a tag, maybe flags.

**verb.** A function named for the transform.

**capsule.** The encapsulation wall. Drawn around a system.

**tagged union.** Mutually exclusive kinds, dispatched by a switch or table.

**flag.** A mixable capability on a fat struct, or a row in that capability's
table.
