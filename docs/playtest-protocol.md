# Playtest Protocol

Full styled version: https://claude.ai/code/artifact/7155296c-a3d9-4829-b7ee-639df2152e29

Run this before any further Next-tier investment (docs/phase-12-next-roadmap.md). Everything verified so far has been Playwright driving a browser - this is the first time a real child's reaction decides anything.

## What this is actually testing

- Does a 5-9 year old get through the ten-minute loop without adult help?
- Do they describe it as fun, or as schoolwork with extra steps?
- Do they actually retain the vocabulary afterward?
- Does turn-based combat feel exciting, or slow, to a young child?
- Do the placeholder shapes read as charming, or as "this looks broken"?

## Who & how many

5-10 kids, split roughly evenly across Fledgling (4-6) and Wordsmith (7-9). Spanish as their primary language, little to no prior English instruction. One session per child, one device, ~15-20 minutes total.

## Consent & privacy

- Parent/guardian consent first, always - explain plainly what happens and that nothing is being evaluated about the child.
- Nothing leaves the device - no accounts, no cloud database, a local browser profile with no PII attached. True and easy to tell a parent.
- Recording video/audio needs its own separate, explicit consent - don't fold it into general play permission. Default to notes.
- Tell the child there's no wrong answer - frame it as "will you try this game and tell me what you think," never as a test of them.
- Stop immediately if a child seems distressed or disengaged, for any reason.

## Running a session

1. Quiet space, one device, no audience.
2. Sit beside, not hovering. "I'm going to watch you play - there's no wrong way to play."
3. Let them do character creation themselves; note whether they needed help at all.
4. Watch the whole loop: village -> Orin/Pip -> three word-orbs -> Puddlewump -> reward -> gate opening.
5. Only help if genuinely stuck (~60s of no progress + visible frustration). Note every intervention and when.
6. At the gate (or if they want to stop), do the recall check and debrief below - casually, in Spanish.

## What to watch for

| Moment | Watch for |
|---|---|
| Character creation | Time to complete; hesitation on button meaning |
| Meeting Orin/Pip | Did they engage with dialogue or tap through immediately? |
| First word-orb | Understood the mechanic unprompted? Reaction to a wrong answer? |
| Puddlewump appears | Any visible reaction? |
| Combat | Right pace, or waiting? Notice their answer changed the outcome? |
| Reward/level-up | Any reaction to "+40 XP" / "LEVEL UP"? Understood what happened? |
| Gate opens | Do they want to keep going? Clearest engagement signal available. |

## Debrief questions

**Recall check** (the actual "did learning happen" measure): "¿Te acuerdas de las palabras que aprendiste? ¿Qué era esto?" - point to something red, a dog, a book, etc., ask for 3-4 unprompted.

**Then, casually**: "¿Qué fue tu parte favorita?" / "¿Esto se sintió como un juego, o como tarea de la escuela?" / "¿Quieres seguir jugando?" Don't lead - if they say "homework," let them explain in their own words rather than fishing for a specific answer.

## What changes based on what you see

- **Placeholder art actively repels them** -> art moves ahead of everything else in the Next tier.
- **Combat feels slow** -> a pacing fix, not a reason to add more classes yet.
- **Needed adult help at a specific point** -> a concrete UX bug to fix, not a "kids need more guidance" conclusion.
- **Recall check goes well and they call it fun** -> the core hypothesis holds; green light for the rest of the Next tier as planned.
- **They ask to keep playing past the gate** -> the strongest possible signal. Note exactly what they expected to find there.
