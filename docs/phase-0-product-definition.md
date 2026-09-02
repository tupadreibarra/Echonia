# Phase 0 — Product Definition

Full styled version: https://claude.ai/code/artifact/dd67df39-a6a9-4b66-a52c-996843f11bd8

## Game concept

**Echonia** (working title) is a free 2D fantasy RPG for Spanish-speaking children ages 4-12. In this world, spoken words carry literal magical power. The language most people speak day to day is Spanish (in-fiction, the "Common Tongue"); English is the "Old Tongue" that shaped the world's magic long ago and is now fading. The player is one of the rare children who can still hear it.

This gives every mechanic in the project a consistent in-world reason to exist — why saying a word correctly casts a spell, why gear is earned through vocabulary mastery, why Spanish support fades as the player improves — instead of feeling like an EFL app wearing a costume.

## Core fantasy (child's POV)

"I'm the first person in generations who can hear the Old Words — and the world needs me to bring them back." The player is a **Wordbound Hero**. **Pip**, a spark-spirit companion, teaches them. **Master Orin**, the village elder, explains the stakes. Every word learned becomes something the player can *do*.

## First ten minutes

Hero naming/appearance → class choice → arrive in Emberhollow → meet Orin + Pip → learn "Hello" and "My name is..." → 3-5 words in context → a Puddlewump (friendly enemy) appears → simple battle where correct answers power attacks → victory, XP, gear reward → equip it → village gate opens onto the wider world.

## Core game loop

EXPLORE → MEET NPC/PROBLEM → RECEIVE QUEST → ENCOUNTER ENGLISH → USE ENGLISH → CHALLENGE → REWARD → UPGRADE HERO → UNLOCK → (loop)

## Educational loop

No separate "lesson screen." Every ENCOUNTER/USE ENGLISH step is a graded activity (listen-and-tap, image match, word-order drag, etc.) staged inside something diegetic. Every attempt quietly updates a per-skill mastery score; the child only sees the visible gameplay consequence.

## Classes

| Class | Identity | English mechanic |
|---|---|---|
| Knight (Shieldspeaker) | Front-line, physical | Vocabulary/phrase recognition powers sword-swing strength |
| Mage (Wordweaver) | Ranged, spell-based | Word-order drag completes a "spell circle" |
| Archer (Listening Eye) | Ranged precision | Spoken instruction → aim at matching target |
| Healer (Kindtongue) | Support | Caring phrases restore HP/shields to self or allies |
| Rogue (Quicktongue) | Speed/combos | Rapid flashcard-speed word recognition chains combos |

## World

Home hub **Emberhollow**, plus seven regions: Runeglade Forest (phonics), Chatterdell (vocabulary), The Murmuring Deep (listening), The Inkbound Archive (reading/spelling), Sentara Bridgelands (grammar), Court of Tongues (conversation), Highspire Dragon Academy (capstone).

## Progression

XP/levels, gear tied to *mastery of a vocabulary category* (not just grinding), abilities unlocked via quest completion, companions unlocked via pronunciation milestones (post-speech-recognition), soft-gated world unlocking (exploration never blocked, only quest completion requires the skill). No pay-to-win, ever.

## Adaptive difficulty

Age picks a starting tier. Ongoing play updates six per-skill mastery scores (vocabulary, listening, pronunciation, reading, spelling, grammar) via a lightweight spaced-repetition-style rule — not machine learning, for now. The child never sees a grade; a low score only changes what appears next (easier variant, one more repetition, a hint).

## Version 0.1 scope

**In:** one hub map, one NPC (Orin) + Pip, one playable class (Knight), 2-3 appearance choices, one enemy (Puddlewump), one combat loop, one mini-lesson (3-5 vocab items), basic XP, one equipment reward, minimal inventory, one unlockable path, local save.

**Deferred:** other four classes, microphone/speech recognition, any AI-generated content, parent/teacher dashboards, real accounts, the full spaced-repetition engine, multiplayer, cosmetic shop, regions beyond the hub.

## Risks

Scope creep, speech recognition reliability, "feels like school" risk, content production bottleneck, over-building adaptive difficulty before there's usage data, child privacy/compliance (COPPA/GDPR-K), art production cost, engagement-vs-learning-outcome tension, performance on older devices, team/velocity risk for a large multidisciplinary scope.

## Success criteria

A child aged ~5-9 can go from landing page to defeating the Puddlewump and equipping a reward unassisted in ~10 minutes; doesn't describe it as schoolwork; retains the taught vocabulary in an immediate recall check; sees combat visibly change based on English performance; runs smoothly with progress surviving a reload; content editable from data files with zero code changes.
