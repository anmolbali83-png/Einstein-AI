# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Salesforce DX project** (project name: `AgentForce`) that serves as a collection of Einstein AI code examples. It demonstrates three AI integration patterns: Prompt Template generation via the `ConnectApi.EinsteinLLM` API, Flow-invocable Apex actions for AI agents/copilots, and external callout integrations. API version: 59.0.

## Commands

### Setup
```bash
npm install   # Install linting, testing, and formatting tools
```

### Linting & Formatting
```bash
npm run lint              # ESLint for Aura and LWC JavaScript
npm run prettier          # Format all metadata files (cls, html, js, xml, etc.)
npm run prettier:verify   # Check formatting without modifying files
```

### Testing LWC Components
```bash
npm run test:unit                                      # Run all LWC Jest tests
npm run test:unit:watch                                # Watch mode
npm run test:unit:coverage                             # With coverage report
npx sfdx-lwc-jest -- --testPathPattern=flexTemplateLwc # Run a single component's tests
```

### Salesforce CLI

> **Tooling rule — use MCP servers first:**
> - **Salesforce activities** (deploy, retrieve, SOQL, Apex tests, code analyzer, metadata exploration, LWC/LDS guidance, etc.): use the **Salesforce MCP** tools (`mcp__Salesforce__deploy_metadata`, `mcp__Salesforce__retrieve_metadata`, `mcp__Salesforce__run_soql_query`, `mcp__Salesforce__run_apex_test`, `mcp__Salesforce__run_code_analyzer`, `mcp__Salesforce__guide_lwc_development`, etc.).
> - **Git / GitHub activities** (branches, PRs, issues, commits on remote, file operations on GitHub): use the **GitHub MCP** tools (`mcp__github__create_pull_request`, `mcp__github__create_branch`, `mcp__github__create_issue`, `mcp__github__get_pull_request`, `mcp__github__list_pull_requests`, `mcp__github__merge_pull_request`, `mcp__github__create_or_update_file`, etc.).
> - **Jira activities** (issues, sprints, boards, comments): use the **Atlassian MCP** tools (`mcp__mcp-atlassian__jira_get_issue`, `mcp__mcp-atlassian__jira_search`, etc.).
> - Fall back to the `sf` / `git` / `gh` CLI commands below **only if** the corresponding MCP is unavailable or fails after a real attempt.

> **Jira issue fetching rule:**
> When asked to read, fetch, or review a Jira issue, **always** make both of these calls **in parallel**:
> 1. `mcp__mcp-atlassian__jira_get_issue` with `fields: "*all"` — fetches every field (summary, description, acceptance criteria, custom fields, etc.), not just the default essentials.
> 2. `mcp__mcp-atlassian__jira_get_issue_images` — fetches all attached images (design mockups, screenshots, wireframes) so they can be viewed and described inline.
>
> Never fetch an issue with default/partial fields. Never skip the image call — assume every ticket may contain visual attachments that are critical context.
>
> **UI generation from Jira issues:**
> When asked to build a UI component from a Jira issue, follow this priority:
> 1. **If images are attached** — build the UI to match the attached design mockup/wireframe as closely as possible.
> 2. **If no images are attached** — design and build the UI based on the story description and acceptance criteria from the issue.

```bash
sf auth web login                                                              # Authenticate to org (no MCP equivalent)
sf org create scratch --definition-file=config/project-scratch-def.json --set-default
sf project deploy start --source-dir=force-app                                # Fallback: deploy to org
sf project retrieve start                                                      # Fallback: pull from org
sf apex run test --test-level RunLocalTests                                    # Fallback: run Apex tests
```

## Architecture

### Two Einstein AI Integration Patterns

**Pattern 1 — Direct Prompt Template call via `ConnectApi.EinsteinLLM`** (used in `FlexTemplateController.cls`):
- Fetches Account, Product2, and Soft_Drink__c records
- Packages them as `ConnectApi.WrappedValue` entries in an `inputParams` map
- Calls `ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate('Customer_Pitch', executeTemplateInput)` to invoke a named Prompt Template from Setup
- Returns the generated text to the LWC via `@AuraEnabled`

**Pattern 2 — `@InvocableMethod` for Agentforce/Flow invocation** (used by all other Apex classes):
- Each class exposes one `@InvocableMethod` with a `description` that acts as natural language instructions for the AI agent
- Inner `Input`/`Output` (or `InputWrapper`/`OutputWrapper`) classes use `@InvocableVariable` with `description` fields — these descriptions guide the agent when populating variables
- Methods are called by Salesforce Flows, which are triggered by Agentforce agents in response to user prompts

### Apex Classes (Backend — `force-app/main/default/classes/`)

| Class | Role |
|---|---|
| `FlexTemplateController` | `@AuraEnabled` — calls `ConnectApi.EinsteinLLM` directly with a named Prompt Template |
| `AccountSummaryPrompt` | Invocable — returns soft drink orders + cases for an Account as a prompt string (CapabilityType: `einstein_gpt__recordSummary`) |
| `CaseCopilot` | Invocable — creates a Case and calls `TicketSystem` to mirror it in FreshDesk |
| `CaseUpdates` | Invocable — finds a queue by developer name and assigns a case to it |
| `CaseUpdatesDataCloud` | Invocable — same as `CaseUpdates` but also updates Case Priority (Data Cloud variant) |
| `SoftDrinkOrderController` | Invocable — creates a `Soft_Drink_Order__c` record |
| `SoftDrinkOrderStatus` | Invocable — returns the status of a soft drink order by order number |
| `UserInfoHandler` | Invocable — returns current user's name, company, employee number, and role |
| `ZipCodeName` | Invocable (`callout=true`) — looks up a city name from a ZIP code via ZipCodeStack API |
| `TicketSystem` | Helper — `POST` to the FreshDesk API via Named Credential `callout:freshDesk` |
| `AccountSummaryController` | `@AuraEnabled` — fetches open opportunities (max 5) and open cases (max 5) for an Account; uses `USER_MODE` for field-level security |
| `CaseLockController` | `@AuraEnabled` — powers `caseLock` LWC; returns case data, comments (max 50), attachments; handles feedback submission |

### LWC Components (Frontend — `force-app/main/default/lwc/`)

| Component | Target | Role |
|---|---|---|
| `flexTemplateLwc` | RecordPage, AppPage, HomePage, Tab | UI for selecting Account name + rating, calls `FlexTemplateController` to invoke the Einstein Prompt Template, displays result as rich text |
| `caseLock` | Case RecordPage only | Dual-mode: read-only locked view (Status = Closed/Resolved) with comments, attachments, and feedback form; editable form for active cases |
| `accountSummary` | Account RecordPage only | Displays account info, open opportunities, and open cases; uses `NavigationMixin` for record navigation |

`caseLock` wires three methods from `CaseLockController`: `getCaseData`, `getCaseComments`, `getCaseAttachments`. Feedback submission calls `submitFeedback` as an imperative, creating a CaseComment prefixed with `[Feedback]`.

### Custom Domain Objects

- **`Soft_Drink__c`**: Product-like object (AutoName: "Drink Name"); fields include Name, Rating__c, Price__c, Quantity_Left__c, Quantity_Used__c, Total_Quantity__c, Status__c, Sugar__c, Tags__c, brewery_Name__c, brewery_id__c, Description__c, Image__c, Id__c
- **`Soft_Drink_Order__c`**: Junction object linking Account and Soft_Drink__c (AutoNumber: `SD-{00000000}`, sharing ControlledByParent); fields: Account__c, Soft_Drink__c (lookup), Quantity__c, Price__c, Status__c, Order_Number__c
- **`Part__c`**: Part catalog (Name labeled "Part Number"); fields: `Part_Description__c` (Text 255), `Part_Cost__c` (Currency 18,2). Referenced by `Case.Part_Number__c` lookup.
- **`Brand__c`**: Equipment brand catalog (Name labeled "Brand Name"); fields: `Brand_Code__c` (Text 20).
- **`Model__c`**: Equipment model catalog (Name labeled "Model Name"); fields: `Brand_Name__c` (Lookup → `Brand__c`). Referenced by `Asset.Model_Name__c` lookup.

Equipment hierarchy: `Brand__c` ← `Model__c` ← `Asset` (via `Asset.Model_Name__c`). Models roll up to Brands; Assets roll up to Models.

Standard objects with custom fields:
- **`Case`**: freshDeskId__c, Quick_Summary__c, FreshDesk_URL__c, Product__c, EngineeringReqNumber__c, PotentialLiability__c, SLAViolation__c, Used_With__c (Text 50), No_Causal_Part_Reason__c (picklist: No Fault Found / Legacy Part / Missing Part), Part_Number__c (Lookup → `Part__c`), Actions_Taken_By_Dealer__c (LongTextArea), Global_Main_Area__c / Global_Sub_Area__c (picklists for failure-area taxonomy).
- **`Asset`**: Tracked in source (standard + custom fields). Customs: Model_Name__c (Lookup → `Model__c`), Machine_Type__c (formula → `Product2.Type__c` via TEXT()), Series__c (formula → `Product2.Series__c`), Unit_of_Measure__c (picklist), Usage__c (Number 18,0), Engine_Serial_Number__c (Text 80).
- **`Product2`**: Rating__c, Type__c (picklist, source for `Asset.Machine_Type__c` formula), Series__c (source for `Asset.Series__c` formula).
- **`Account`**: Account_Summary__c, Active__c, SLA__c, etc.
- **`Order`**: Return_Status__c.
- **`Contact`**: Languages__c, Level__c.
- **`Lead`**, **`Opportunity`**: various sales/marketing fields.

### Flows (`force-app/main/default/flows/`)

Three auto-launched flows:
- `Create_a_Task_Flow` — creates a Task; sets ActivityDate to today, owner to current user; inputs: subject, relatedId
- `Update_Soft_Drink_Flow` — sets a `Soft_Drink__c` record to "Expired" and bulk-updates related `Soft_Drink_Order__c` records to "Cancelled"
- `Initiate_Return` — validates order is within 30-day return window, then sets `Order.Return_Status__c` to "Initiated"

### External Integrations

- **FreshDesk**: Uses Named Credential `callout:freshDesk` in `TicketSystem.cls`. Must be configured in Setup → Security → Named Credentials before deployment.
- **ZipCodeStack API**: `ZipCodeName.cls` has a hardcoded `apikey` header value of `'YOUR_API_KEY'` — replace with a real key or convert to a Named Credential/Custom Setting before use.

## Code Quality

Pre-commit hooks (Husky + lint-staged) automatically run Prettier on all staged metadata files and ESLint on staged LWC/Aura JavaScript. ESLint uses `@salesforce/eslint-config-lwc` for LWC and `@salesforce/eslint-plugin-aura` for Aura.

# Rule: Salesforce Metadata Generation

## Objective
Enforce: **skill load -> API context -> file generation** for all Salesforce metadata.

## Constraints

1. **Never write** without a loaded metadata type skill for that type.
2. **One type at a time** - complete the full cycle for the current type before moving to the next type.
3. **Always attempt `salesforce-api-context` MCP** for each type before writing; if unavailable after a real attempt, fall back to the skill for that type and ensure it is loaded before generating files for that metadata type.
4. **Child types need their own API context response** - if adding child metadata inside a parent metadata file, load the child metadata skill and use `salesforce-api-context` MCP for each child type separately; do not rely on the parent's schema or API context response for child metadata creation. The same fallback in constraint 3 applies.
5. **Do not call `execute_metadata_action` unless a skill instructs you to do so.**

## Initial Gate

Never create files or generate metadata before completing skill selection.

1. Determine whether the request is app-level or metadata-type-level.
2. Identify the best-matching candidate skill for the request.
3. If the request is app-level, identify the exact app-level skill that will orchestrate the work.
4. If the request is metadata-type-level, identify the target metadata type and the best-matching per-type metadata skill for that type. Do not treat skill selection as the per-type skill-load step.
5. Confirm skill selection with:
   `intent=<app|type> | best_matched_skill=<exact-skill-name|none> | skill_selection=complete|pending`
6. Set `skill_selection=complete` only after the exact selected skill name has been identified and recorded.
7. Print this exact skill-selection status line in the chat before proceeding.

Do not continue until `skill_selection=complete` and `best_matched_skill=<exact-skill-name|none>` are recorded.

## App-Level Gate

If `intent=app`, complete this gate before starting the per-type loop.

1. Load the selected app-level skill.
2. Use the loaded app-level skill to identify metadata types, dependency order, and orchestration requirements.
3. Record:
   `app_skill=<exact-skill-name|none> app_plan=complete|pending`

Do not start any per-type skill load, API-context call, or metadata generation for an app-level request until `app_skill=<exact-skill-name|none>` and `app_plan=complete` are recorded.

## Per-Type Loop (a-e)

For each metadata type in scope, whether identified by an app-level skill or requested directly, execute steps a through e below one metadata type at a time. Do not create or modify files for the current metadata type, and do not move to the next metadata type, until steps a through e are complete.

**a. Load Skill**
- **Critical:** Load the best-matching skill for the current metadata type. No metadata may be generated for this type until the skill is loaded.
- Record `best_matched_skill=<exact-skill-name|none>` for the current metadata type before proceeding.
- Load once per type, not per record.
- If no matching skill exists, stop and ask for guidance instead of writing without a skill.

**b. Use `salesforce-api-context` MCP**
- Use one or more of these tools as required:
  - `get_metadata_type_sections`
  - `get_metadata_type_context`
  - `get_metadata_type_fields`
  - `get_metadata_type_fields_properties`
  - `search_metadata_types`
- A real attempt means calling at least one relevant `salesforce-api-context` tool for the current metadata type and recording either the returned context or the failure/unavailable result.
- Attempt API context for every type before writing.
- Record `mcp=complete` and `mcp_tools=<tool-list>` for the current metadata type when API context succeeds.
- If API context is unavailable after a real attempt, record `mcp=unavailable` and `mcp_tools=none`, ensure the skill for this type is loaded, and then continue using that skill.
**c. Pre-Write Gate**
- Before EVERY write: confirm `best_matched_skill=<exact-skill-name>` is recorded and that skill is loaded for this type.
- Before EVERY write: confirm `mcp=complete` and `mcp_tools=<tool-list>` are recorded for this type, or confirm `mcp=unavailable` after a real attempt.

**d. Generate Files**
- Use the loaded skill + API context when both are available.
- Use the loaded skill alone when API context was unavailable after a real attempt.
- Generate all records for this type now.

**e. Checkpoint**
- Skill loaded? API context called or unavailable after a real attempt? All files written?
- Only proceed to the next type when all are true.

## Anti-Patterns

| Don't | Why | Do |
|-------|-----|-----|
| Never write without loading the metadata skill | Missing platform constraints | Load the skill before any write |
| Never mark `skill_selection=complete` without `best_matched_skill=<exact-skill-name\|none>` | Fake gate completion | Record the exact selected skill before continuing |
| Never start per-type execution for an app-level request before loading the selected app-level skill | Orchestration is skipped | Complete the App-Level Gate before entering the per-type loop |
| Never treat skill selection as skill loading | Fake gate completion | Perform the actual per-type skill load in step a |
| Never skip the Initial Gate | Sequence breach | Complete skill selection before any generation |
| Never reload a skill per record | Wastes tokens | Load once per type |
| Never skip the API context attempt for any type | No schema for those types | Attempt API context for EVERY type |
| Never write using API context alone without a loaded skill | Missing platform constraints | Load the skill first; if no matching skill exists, stop and ask for guidance |
| Never write without recorded `mcp=complete` and `mcp_tools`, or `mcp=unavailable` | No evidence of MCP gate completion | Record MCP status and tool usage before any write |
| Never skip any gate in the loop (skill load, API context, pre-write, checkpoint) | Wrong artifacts | Follow all mandatory gates in the loop (a-e) |
| Never write with a missing checkpoint | Aware violation | Stop and complete missing step |