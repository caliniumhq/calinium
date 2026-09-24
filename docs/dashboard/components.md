# Dashboard Components

All merchant-facing UI components have one responsibility and receive state/actions through the interview hook rather than importing engine code.

Phase 9B.1 adds `DashboardShell`, `AuthScreen`, `HomeScreen`, `ProjectForm`, `ProjectScreen`, and `SettingsScreen`. Phase 9A.3 adds Asset Library and merchant-profile presentation components. They render account, organization, project, activity, assets, and locked future-workflow states through the Dashboard service boundary. They do not import the Merchant Interview Engine or duplicate its catalog, branching, validation, or profile mapping logic.

| Component | Responsibility |
| --- | --- |
| `WelcomeScreen` | Starts or resumes an in-progress interview. |
| `InterviewLayout` | Provides shell, sidebar, progress, and autosave status. |
| `CategorySidebar` | Shows ten catalog categories, beginning with Discovery, and the summary step. |
| `ProgressBar` | Announces current step, completion, and remaining estimate. |
| `AutosaveIndicator` | Announces saving, saved, or error state without interrupting typing. |
| `QuestionCard` | Provides question heading, help text, requirement state, and validation relationship. |
| `QuestionRenderer` | Renders every supported catalog answer type from `answer_type`. |
| `NavigationFooter` | Previous, next, optional skip, save/exit, and cancel controls. |
| `SummaryCard` / `ProfilePreview` | Displays merchant-confirmed answers and the profile preview. |
| `ConfirmationDialog` | Confirms profile creation or terminal cancellation. |
| `CompletionScreen` | Shows completion without invoking Strategy generation. |
| `AssetUploader` | Uploads a catalog-declared asset through the authenticated Asset Service. |
| `ColorPaletteEditor` | Collects manual color values, contrast feedback, and explicit extracted-palette approval. |
| `ReferenceListEditor` | Collects distinct inspiration or competitor records from catalog UI metadata. |
| `AssetLibraryScreen` | Lists, filters, previews, and safely removes project-owned assets. |
| `MerchantProfileScreen` | Presents confirmed profile context without making raw JSON the default experience. |

## Merchant Creative Director components

Milestone 12 adds a distinct merchant journey under `src/components/creative-director/`. These components use `useCreativeDirector` and the server-facing `CreativeDirectorService`; none imports conversation, strategy, storage, or generation internals.

| Component | Responsibility |
| --- | --- |
| `CreativeLandingScreen` | A quiet entry point for Start Designing, premium-theme browsing, and durable-project continuation. |
| `StageHeader` / `ProgressStepper` | Gives the journey a labelled stage and permits only a service-approved backward revisit, restart, or pause. |
| `ConversationScreen` / `ConversationBubble` / `ThinkingIndicator` | Renders one deterministic conversation exchange at a time, transcript, contextual input, and real pending state. |
| `UnderstandingScreen` / `SummaryCard` | Shows Calinium’s understanding before a Brand Blueprint exists and sends corrections to the engine-owned path. |
| `BrandBlueprintScreen` / `ApprovalCard` | Presents the Creative Brief in merchant language and captures explicit approval or revision. |
| `StoreStrategyScreen` / `RecommendationCard` | Shows recommendation, rationale, and per-recommendation approval/rejection/revision controls. |
| `ResourcePicker` | Groups meaningful resource needs and routes asset selection through the existing Asset Library without exposing raw theme setting IDs. |
| `GenerationScreen` / `GenerationTimeline` | Shows only genuine pipeline events and the resource-blocked state. |
| `PreviewScreen` / `PreviewCard` | Describes the isolated review package and keeps live deployment separate. |
| `FinishScreen` / `StatusBadge` | Communicates final review handoff and readable status without color-only meaning. |

New components must not encode question IDs, option lists, dependencies, validation rules, or Merchant Profile mappings. Those remain owned by the existing Merchant Interview catalog and engine.
