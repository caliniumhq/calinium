# Dashboard State Management

`useInterviewSession` holds display state only: catalog, current serializable session, unsaved draft values, active category, phase, validation messages, and autosave status.

## Persistence

The `InterviewService` owns UI-facing interview use cases, but it no longer owns browser persistence. In Phase 9B.1, it calls authenticated project-scoped API endpoints. The server persists the engine-generated serializable session and active category ID inside the project’s durable storage envelope.

Every accepted answer is saved through the engine session layer before it is written to the project record. A stored in-progress session is validated and resumed through the engine before the UI displays it. Completed and abandoned sessions remain durable lifecycle evidence; the browser retains only transient React state while the page is open.

No Shopify resources, uploaded files, or merchant content are transmitted to a third party. Account, organization, project, and session isolation are enforced by the authenticated server boundary. See [durable storage](storage.md).

## Validation and drafts

Draft input state allows a merchant to correct a malformed value without overwriting the last valid session record. The UI sends candidate answers to the existing engine inspection/validation surface, then persists valid partial answers using `saveProgress`. Required checks for navigation and summary use the engine’s complete-answer validation.
