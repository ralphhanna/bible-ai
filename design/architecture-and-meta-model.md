# Architecture and Meta-Model

## Status

Initial architecture and meta-model design for review and refinement.

## 1. Purpose

This document defines the logical architecture of Bible AI and the meta-model used to organize, discover, validate, trace, and retrieve knowledge.

The design supports the project strategy:

- understand the user before answering;
- identify topic, intent, purpose, sentiment, and clarity;
- prefer reviewed knowledge over repeated searches;
- rely on Scripture and clearly identified reliable external resources;
- search only when existing knowledge is insufficient;
- produce concise, traceable, source-based answers;
- allow progressive exploration into deeper material.

The meta-model is not the theological content itself. It defines the types of knowledge objects that may exist, their required properties, and how they relate to one another.

## 2. Architectural Principles

### 2.1 Scripture is the primary authority

The system may use commentaries, books, articles, teachers, dictionaries, and other resources, but these sources remain subordinate to Scripture.

### 2.2 The system is not its own source

Bible AI does not present generated text as independent revelation, doctrine, or authority. Answers are assembled from Scripture and identified reliable resources. AI may classify, retrieve, summarize, compare, and explain, but the supporting sources must remain discoverable.

### 2.3 Topic is the primary knowledge object

The main reusable unit is the topic or subtopic, not the exact user sentence and not an isolated Bible verse.

Examples:

- prayer;
- unanswered prayer;
- salvation by grace;
- assurance of salvation;
- the deity of Christ.

Many differently worded questions may map to the same topic.

### 2.4 Content and presentation are separate

The system separates:

```text
Topic      = What is the user talking about?
Intent     = What does the user want?
Purpose    = Why is the user asking?
Sentiment  = How should the answer be presented?
Knowledge  = What do Scripture and approved sources teach?
```

Intent and sentiment may alter structure and tone, but they must not silently alter doctrine.

### 2.5 Every important answer is traceable

The architecture must support this chain:

```text
User message
→ message analysis
→ topic match
→ canonical question
→ approved topic
→ theological claims
→ Bible references
→ supporting sources
→ response composition
```

## 3. Logical Architecture

Bible AI is divided into six logical layers.

```text
1. Conversation Layer
2. Analysis and Classification Layer
3. Knowledge and Retrieval Layer
4. Research and Source Layer
5. Response Composition Layer
6. Governance and Validation Layer
```

### 3.1 Conversation Layer

Responsibilities:

- receive user messages;
- maintain conversational context;
- detect whether a message is a question, statement, objection, request, or continuation;
- deliver clarification questions and final responses.

This layer does not determine doctrine.

### 3.2 Analysis and Classification Layer

Responsibilities:

- identify language;
- identify message type;
- detect topic and subtopic candidates;
- detect intent and purpose;
- detect sentiment and intensity;
- assess clarity and confidence;
- normalize the message into one or more canonical questions.

Output example:

```yaml
message-analysis:
  language: en
  message-type: question
  topics:
    - topic.prayer.unanswered
  intent: intent.explanation
  purpose: purpose.personal-understanding
  sentiment:
    type: sentiment.discouraged
    intensity: moderate
  clarity: high
  confidence: 0.91
  canonical-question: question.prayer.why-unanswered
```

### 3.3 Knowledge and Retrieval Layer

Responsibilities:

- retrieve approved topic knowledge;
- retrieve claims, summaries, references, and related questions;
- determine whether available knowledge is sufficient;
- avoid unnecessary repeated research;
- preserve source and review metadata.

### 3.4 Research and Source Layer

Responsibilities:

- search Scripture and approved external resources when needed;
- identify sources by title, author, edition, publisher, URL, or collection;
- collect relevant evidence;
- distinguish quotations, paraphrases, summaries, and AI synthesis;
- return source-backed material to the knowledge layer.

### 3.5 Response Composition Layer

Responsibilities:

- select the appropriate response pattern for the user intent;
- apply sentiment-sensitive presentation guidance;
- begin with a concise answer;
- include Scripture references and other sources where appropriate;
- distinguish direct biblical teaching from interpretation;
- offer deeper exploration without overwhelming the user.

### 3.6 Governance and Validation Layer

Responsibilities:

- enforce the Statement of Faith;
- validate schemas and references;
- track review status and versions;
- prevent unapproved content from being treated as authoritative;
- detect broken relationships and duplicate identifiers;
- manage revision and deprecation.

## 4. Repository Models

The repository is organized conceptually into five models.

```text
foundation
knowledge
classification
sources
 governance
```

### 4.1 Foundation Model

Defines the stable purpose and boundaries of the project.

Objects:

- mission;
- strategy;
- statement of faith;
- editorial principles;
- source policy.

### 4.2 Knowledge Model

Defines what the system knows.

Objects:

- topic;
- claim;
- canonical question;
- summary;
- Bible reference;
- relationship;
- response support package.

### 4.3 Classification Model

Defines how user messages are understood.

Objects:

- message type;
- intent;
- purpose;
- sentiment;
- clarity level;
- response pattern;
- clarification policy.

### 4.4 Source Model

Defines where knowledge comes from.

Objects:

- source;
- source collection;
- author;
- work;
- edition;
- excerpt or evidence item;
- source evaluation.

### 4.5 Governance Model

Defines how content becomes trusted and maintainable.

Objects:

- review record;
- approval state;
- version;
- doctrinal alignment;
- validation rule;
- deprecation record.

## 5. Meta-Model Overview

The following object types form the initial meta-model.

```text
FoundationDocument
Topic
Claim
CanonicalQuestion
Summary
BibleReference
Source
SourceCollection
Intent
Purpose
Sentiment
ResponsePattern
Relationship
ReviewRecord
VersionRecord
```

## 6. Common Object Contract

Every discoverable object should implement a common minimum contract.

```yaml
id: string
kind: string
title: string
status: draft | generated | under-review | approved | deprecated
version: string
created: date
updated: date
```

Recommended common properties:

```yaml
description: string
aliases: []
tags: []
owner: string
review:
  status: string
  reviewed-by: []
  reviewed-date: date
```

### Identifier Rules

Identifiers must be:

- unique across the repository;
- stable across file moves;
- human-readable;
- lowercase;
- dot-separated by domain and subtype.

Examples:

```text
topic.prayer
topic.prayer.unanswered
claim.prayer.aligns-with-gods-will
question.prayer.why-unanswered
intent.personal-guidance
sentiment.discouraged
source.bible.esv
```

## 7. Core Knowledge Objects

### 7.1 Topic

A topic is the central theological knowledge object.

Required properties:

```yaml
id: topic.prayer.unanswered
kind: topic
title: Unanswered Prayer
parent: topic.prayer
definition: string
summary: summary.prayer.unanswered
claims: []
canonical-questions: []
references: []
related-topics: []
sources: []
status: approved
version: 1.0
```

A topic may have one parent and many related topics.

A topic may contain or reference many claims, questions, Bible references, and sources.

### 7.2 Claim

A claim is a specific theological statement that can be supported, reviewed, and traced.

Example:

```yaml
id: claim.prayer.aligns-with-gods-will
kind: claim
statement: Prayer should be offered in submission to the will of God.
topic: topic.prayer.unanswered
support:
  bible-references:
    - bible.1-john.5.14-15
  sources: []
certainty: direct | inferred | disputed
status: approved
version: 1.0
```

Claims are more precise than attaching every reference only to a broad topic.

### 7.3 Canonical Question

A canonical question is a normalized form of many possible user phrasings.

Example:

```yaml
id: question.prayer.why-unanswered
kind: canonical-question
question: Why are some prayers not answered as requested?
topic: topic.prayer.unanswered
aliases:
  - Why is God ignoring me?
  - Why did God not answer my prayer?
  - Does God answer every prayer?
intents:
  - intent.explanation
  - intent.personal-guidance
status: approved
version: 1.0
```

The aliases are examples and retrieval hints, not an exhaustive list.

### 7.4 Summary

A summary provides a reviewed reusable explanation at one or more depths.

```yaml
id: summary.prayer.unanswered
kind: summary
topic: topic.prayer.unanswered
brief: string
standard: string
detailed: string
claims: []
references: []
sources: []
status: approved
version: 1.0
```

The summary is an authoritative response foundation, not necessarily a fixed answer sent unchanged to every user.

### 7.5 Bible Reference

A Bible reference links a topic or claim to a passage and records its purpose.

```yaml
id: bible.1-john.5.14-15
kind: bible-reference
book: 1 John
chapter: 5
verses: 14-15
role: primary | supporting | example | warning | related
purpose: Prayer according to God's will
translation: null
```

The reference may be translation-neutral unless exact quotation text is stored.

### 7.6 Source

A source identifies an external resource used by the system.

```yaml
id: source.commentary.example
kind: source
source-type: commentary
title: Example Commentary
author: author.example
publisher: Example Publisher
edition: string
url: string
reliability: approved | limited | comparison-only | rejected
theological-position: string
status: approved
version: 1.0
```

A source record identifies the resource. It does not imply that every conclusion in the source is endorsed.

### 7.7 Source Collection

A source collection groups approved or specialized resources.

Examples:

- Bible translations;
- Brethren writers;
- evangelical commentaries;
- original-language tools;
- historical theology;
- comparison-only sources.

```yaml
id: source-collection.brethren-writers
kind: source-collection
title: Brethren Writers
sources: []
usage: preferred | supporting | comparison
status: approved
version: 1.0
```

## 8. Classification Objects

### 8.1 Intent

Intent defines what the user wants the system to do.

Initial intent values:

```text
intent.explanation
intent.verse-meaning
intent.doctrine
intent.personal-guidance
intent.objection
intent.comparison
intent.bible-study
intent.teaching-preparation
intent.fact-lookup
intent.devotional-reflection
```

Example:

```yaml
id: intent.explanation
kind: intent
title: Explanation
response-pattern: response-pattern.direct-explanation
```

### 8.2 Purpose

Purpose records why the user is asking.

Examples:

```text
purpose.personal-understanding
purpose.spiritual-guidance
purpose.study
purpose.teaching
purpose.debate
purpose.research
purpose.encouragement
```

Purpose may be uncertain and should not be over-inferred.

### 8.3 Sentiment

Sentiment controls pastoral and conversational presentation.

Initial sentiment values:

```text
sentiment.neutral
sentiment.curious
sentiment.confused
sentiment.discouraged
sentiment.grieving
sentiment.anxious
sentiment.skeptical
sentiment.angry
sentiment.argumentative
sentiment.hopeful
```

Example:

```yaml
id: sentiment.discouraged
kind: sentiment
title: Discouraged
presentation:
  tone: gentle
  opening: acknowledge-concern
  avoid:
    - imply weak faith
    - begin with academic detail
```

Sentiment is presentation guidance, not theological content.

### 8.4 Response Pattern

A response pattern defines the normal structure of an answer for an intent.

```yaml
id: response-pattern.personal-guidance
kind: response-pattern
sections:
  - brief-acknowledgment
  - direct-answer
  - biblical-support
  - careful-application
  - optional-follow-up
```

## 9. Relationship Meta-Model

Relationships are explicit and typed.

Initial relationship types:

```text
parent-of
child-of
related-to
supports
supported-by
answers
answered-by
cites
cited-by
derived-from
uses-source
has-summary
has-claim
has-question
preferred-interpretation-of
alternative-interpretation-of
conflicts-with
supersedes
deprecated-by
```

A relationship object may be used when the relationship needs metadata.

```yaml
id: relationship.claim-prayer-to-1-john-5
kind: relationship
from: claim.prayer.aligns-with-gods-will
type: supported-by
to: bible.1-john.5.14-15
notes: Direct textual support
status: approved
```

Simple relationships may also be represented directly in object properties when no additional metadata is required.

## 10. Review and Lifecycle Meta-Model

### 10.1 Review Record

```yaml
id: review.topic.prayer.unanswered.1
kind: review-record
object: topic.prayer.unanswered
review-type: theological | editorial | source | technical
reviewer: string
decision: approved | changes-requested | rejected
notes: string
date: date
```

### 10.2 Lifecycle

```text
Draft
→ Generated or Authored
→ Theological Review
→ Editorial Review
→ Approved
→ Revised or Deprecated
```

Only approved objects should be treated as authoritative without additional runtime verification.

### 10.3 Version Record

```yaml
id: version.topic.prayer.unanswered.1.1
kind: version-record
object: topic.prayer.unanswered
version: 1.1
change-summary: Added supporting passage and clarified wording
previous-version: 1.0
date: date
```

## 11. Runtime Processing Model

```text
1. Receive user message
2. Detect language and message type
3. Identify candidate topics
4. Detect intent, purpose, sentiment, and clarity
5. Normalize to a canonical question when possible
6. Retrieve approved topic package
7. Evaluate knowledge sufficiency
8. Retrieve or search approved sources when required
9. Select claims and references
10. Apply response pattern
11. Apply sentiment-sensitive presentation
12. Produce concise answer with source trace
13. Offer deeper exploration
```

### Knowledge Sufficiency Outcomes

```text
Sufficient
→ use approved topic package

Partially sufficient
→ retrieve supporting source material

Insufficient
→ conduct broader source search and synthesis
```

## 12. Response Trace Object

The runtime system should be able to record an internal trace for each answer.

```yaml
response-trace:
  user-message-id: string
  detected-topics:
    - topic.prayer.unanswered
  canonical-question: question.prayer.why-unanswered
  intent: intent.personal-guidance
  sentiment: sentiment.discouraged
  claims-used:
    - claim.prayer.aligns-with-gods-will
  bible-references:
    - bible.1-john.5.14-15
  sources-used: []
  response-pattern: response-pattern.personal-guidance
  search-performed: false
```

This runtime trace should not expose private user data in the shared knowledge repository.

## 13. Proposed Repository Structure

```text
bible-ai/
├── README.md
├── foundation/
│   ├── mission.md
│   ├── strategy.md
│   └── statement-of-faith.md
├── design/
│   └── architecture-and-meta-model.md
├── knowledge/
│   ├── topics/
│   ├── claims/
│   ├── questions/
│   ├── summaries/
│   └── relationships/
├── classification/
│   ├── intents/
│   ├── purposes/
│   ├── sentiments/
│   ├── response-patterns/
│   └── clarification/
├── sources/
│   ├── authors/
│   ├── works/
│   ├── collections/
│   └── evaluations/
├── governance/
│   ├── reviews/
│   ├── versions/
│   ├── validation/
│   └── deprecations/
├── schemas/
└── indexes/
```

## 14. Validation Requirements

The repository validator should eventually verify that:

- every object ID is unique;
- every object declares a valid kind;
- every referenced object exists;
- every topic has a definition and summary;
- every approved claim has biblical or approved source support;
- every canonical question points to a valid topic;
- every approved summary identifies its claims and references;
- every approved external source is clearly identified;
- every approved object has review and version information;
- deprecated objects are not returned as primary knowledge;
- circular parent relationships do not exist;
- conflicting aliases are reported;
- the Statement of Faith governs approved doctrinal content.

## 15. Initial Implementation Scope

The first implementation should support only the minimum viable meta-model:

```text
Topic
Claim
CanonicalQuestion
Summary
BibleReference
Source
Intent
Sentiment
ReviewRecord
```

The initial content set should focus on a small number of high-frequency foundational topics before expanding the schema or taxonomy.

## 16. Open Design Decisions

The following items remain to be decided:

- whether each object is stored in its own YAML file or embedded within topic packages;
- whether Bible references are reusable standalone objects or compact values within claims;
- whether summaries are separate objects or sections of topic files;
- how source reliability is scored and reviewed;
- how multilingual content is represented;
- how competing theological interpretations are modeled;
- how runtime response traces are stored without retaining sensitive user content;
- which fields are mandatory in the first schema version.

## 17. Governing Design Rule

The architecture should remain simple enough for theological editors to understand, while structured enough for software to discover, validate, retrieve, and trace every important piece of knowledge.

The meta-model exists to serve faithful communication of biblical teaching. It must not become more complex than the knowledge and governance needs require.
