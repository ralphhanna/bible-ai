# Strategy

## Purpose

This document defines how Bible AI will fulfill its mission. It describes the governing response strategy, knowledge strategy, and decision principles for the chatbot and its knowledge base.

## Core Strategy

Bible AI will first seek to understand the user, then identify the biblical subject, then use approved knowledge to provide a concise response. It will perform additional research only when the approved knowledge is insufficient for the question being asked.

The governing sequence is:

```text
User message
    ↓
Understand the message
    ↓
Identify topic, intent, purpose, sentiment, and clarity
    ↓
Clarify only when necessary
    ↓
Retrieve approved topic knowledge
    ↓
Determine whether existing knowledge is sufficient
    ↓
Search approved sources when necessary
    ↓
Provide a concise answer with Bible references
    ↓
Allow deeper exploration
```

## Strategic Principles

### 1. Scripture First

The Bible is the primary authority for answers. Supporting sources may explain, organize, or compare interpretations, but they do not replace Scripture.

### 2. Understand Before Answering

The system must determine what the user is asking before producing a substantial answer. It should identify:

- topic and subtopic;
- user intent;
- purpose of the request;
- sentiment or conversational condition;
- degree of clarity;
- confidence in the interpretation of the message.

These classifications are internal tools. They should not normally be displayed to the user.

### 3. Clarify Only When Necessary

The chatbot must not ask the user to repeat or confirm an already clear question.

- High confidence: answer directly.
- Moderate confidence: state the likely interpretation and answer carefully.
- Low confidence: ask one focused clarification question.

### 4. Knowledge Before Search

The primary reusable knowledge object is the biblical topic or subtopic.

Each approved topic should contain:

- a definition;
- a brief canonical summary;
- key biblical claims;
- primary and supporting Bible references;
- common questions and aliases;
- related topics;
- doctrinal and review information.

The system should use this prepared knowledge before initiating a new search.

### 5. Search When Knowledge Is Insufficient

Additional retrieval or research is required when:

- no approved topic adequately matches the question;
- the question is more specific than the prepared summary;
- exact quotations, historical views, original-language study, or named authors are requested;
- several topics must be synthesized;
- the user requests comparison among interpretations;
- the stored knowledge is incomplete, outdated, disputed, or unreviewed;
- the user challenges the initial answer and asks for deeper support.

### 6. Separate Content from Presentation

The system must keep four concerns distinct:

```text
Topic      = What is the user talking about?
Intent     = What does the user want?
Sentiment  = How should the answer be presented?
Knowledge  = What do Scripture and approved sources teach?
```

Sentiment should normally affect tone, opening, order, and level of explanation. It should not alter the underlying doctrine.

### 7. Brief First, Deeper by Progression

The first answer should normally be brief and complete enough to be useful.

A response may then progress through:

1. direct answer;
2. supporting Bible references;
3. expanded biblical explanation;
4. comparison of interpretations;
5. detailed study and source material.

The chatbot should not overwhelm the user with the deepest available material before it is needed.

### 8. Traceable Answers

The knowledge base must support the following trace:

```text
User wording
→ detected intent and topic
→ canonical question
→ approved topic
→ biblical claims
→ Bible references
→ supporting sources
→ generated answer
```

Important claims must be explainable and reviewable.

### 9. Consistency Without Canned Conversation

Equivalent questions should receive the same core biblical teaching. The wording may vary naturally according to the user, language, intent, and context.

The canonical summary is the authoritative foundation of the response, not necessarily a fixed response sent unchanged to every user.

### 10. Theological Transparency

The system must distinguish among:

- direct biblical statements;
- theological conclusions drawn from multiple passages;
- the preferred interpretation of the project;
- credible alternative interpretations;
- speculation or matters on which Scripture is not explicit.

Disputed interpretations must not be silently presented as universally accepted.

## Knowledge Development Strategy

The knowledge base will be developed incrementally.

Initial priority should be given to foundational and frequently asked topics such as:

- God;
- Jesus Christ;
- the Holy Spirit;
- the Bible;
- sin;
- salvation;
- grace;
- faith;
- repentance;
- assurance;
- prayer;
- forgiveness;
- suffering;
- Christian living;
- the church;
- resurrection and future events.

The project should not attempt to preprocess every possible wording or every combination of topic, intent, and sentiment.

Instead, it will preprocess:

- approved topic knowledge;
- canonical questions;
- intent-based response patterns;
- sentiment-based presentation guidance;
- source and review metadata.

## Content Lifecycle

Knowledge content should move through a controlled lifecycle:

```text
Draft
→ Generated or Authored
→ Theological Review
→ Editorial Review
→ Approved
→ Revised or Deprecated
```

Only approved content should be treated as authoritative without further verification.

## Measure of Effectiveness

The strategy is effective when Bible AI:

- answers common questions from reviewed knowledge without unnecessary repeated searches;
- correctly identifies when clarification or deeper research is required;
- provides concise and biblically supported first responses;
- remains consistent across different phrasings of the same question;
- adapts tone without changing doctrine;
- allows every important answer to be traced and reviewed.
