# TDD: MP-6 — New Version of Existing Inspection Form

| Field          | Value                                              |
|----------------|----------------------------------------------------|
| Jira           | MP-6                                               |
| Title          | New Version of existing inspection Form             |
| Status         | To Do                                              |
| Reporter       | Anmol Bali                                         |
| Assignee       | Suman Saha                                         |
| Scope          | Version history modal + deep clone via Lightning Flow |

---

## 1. Overview

Users need to create new versions of inspection forms while preserving a full version history. A **"New Version"** button on the Form__c detail page opens a modal popup displaying all existing versions. From this modal, users can navigate to any version or create a new version — which deep-clones the Form and its related Questions, increments the version number, and links the new form back to the version 1 (root) record.

The solution is implemented using a **Screen Flow** (launched via Quick Action as a modal), an **Invocable Apex** class for deep cloning, and an **LWC component** embedded in the Flow screen for the version history table.

No design mockup was attached to the story — the UI described below is derived from the acceptance criteria.

---

## 2. UI Design (from Story Description)

Since no mockup image was attached, the UI is designed from the story description.

### 2.1 Button Placement

A **"New Version"** button is added to the Form__c detail page layout as a Quick Action. Clicking it opens the Screen Flow as a modal popup.

### 2.2 Modal Popup — Version History

```
┌─────────────────────────────────────────────────────────┐
│  Version History                                    [X] │
│─────────────────────────────────────────────────────────│
│                                                         │
│  VERSION #    CREATED DATE       ACTION                 │
│  ─────────    ────────────       ──────                 │
│  Version 1    2026-04-10         New Version            │
│  Version 2    2026-04-12         New Version            │
│  Version 3    2026-04-16         New Version            │
│                                                         │
│  • "Version #" is a hyperlink → navigates to that       │
│    Form record                                          │
│  • "New Version" is a hyperlink → clones that version   │
│    and creates a new Form with incremented version      │
│                                                         │
│─────────────────────────────────────────────────────────│
│                                          [ Close ]      │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Post-Clone Behavior

After a new version is created:
- The modal shows a success message with a link to the new Form record
- OR the modal closes and the user is navigated to the new version automatically

---

## 3. Data Model

### 3.1 Form__c (existing)

| Field API Name     | Type             | Role in Versioning                                     |
|--------------------|------------------|--------------------------------------------------------|
| `Name`             | AutoNumber (FORM-{00000}) | Unique identifier                               |
| `Form_Title__c`    | Text(255)        | Cloned to new version                                  |
| `Start_Date__c`    | Date             | Cloned to new version                                  |
| `End_Date__c`      | Date             | Cloned to new version                                  |
| `Status__c`        | Picklist         | New version defaults to "Draft"                        |
| `Objects__c`       | Picklist         | Cloned to new version                                  |
| `Version__c`       | Number(18,0)     | Incremented: total existing versions + 1               |
| `Parent_Form__c`   | Lookup(Form__c)  | Always points to version 1 (root). Null on root itself.|

### 3.2 Question__c (existing — child of Form__c)

| Field API Name     | Type             | Role in Cloning                                       |
|--------------------|------------------|-------------------------------------------------------|
| `Name`             | AutoNumber (Q-{00000}) | Auto-generated on clone                          |
| `Title__c`         | LongTextArea     | Cloned to new version                                  |
| `Comment__c`       | LongTextArea     | Cloned to new version                                  |
| `Option__c`        | Picklist         | Cloned to new version                                  |
| `Form__c`          | Lookup(Form__c)  | Re-parented to the new cloned Form record              |

### 3.3 Version Family Tree

```
Form V1 (root)          Parent_Form__c = null,  Version__c = 1
 ├── Form V2            Parent_Form__c = V1.Id, Version__c = 2
 ├── Form V3            Parent_Form__c = V1.Id, Version__c = 3
 └── Form V4            Parent_Form__c = V1.Id, Version__c = 4

All child versions always point to V1 (root), regardless of which
version they were cloned from.
```

---

## 4. Versioning Logic

### 4.1 Find the root form (Version 1)

```
If current Form.Parent_Form__c == null
    → current Form IS the root (Version 1)
Else
    → current Form.Parent_Form__c IS the root
```

### 4.2 Get all versions in the family

```sql
SELECT Id, Name, Version__c, CreatedDate, Form_Title__c
FROM Form__c
WHERE Id = :rootFormId
   OR Parent_Form__c = :rootFormId
ORDER BY Version__c ASC
```

### 4.3 Calculate new version number

```
newVersionNumber = [count of all records from 4.2] + 1
```

### 4.4 Deep clone logic

Given a **source Form** (the version the user clicked "New Version" on):

1. **Clone Form__c:**
   - Copy fields: `Form_Title__c`, `Start_Date__c`, `End_Date__c`, `Objects__c`
   - Set `Status__c` = "Draft"
   - Set `Version__c` = newVersionNumber (from 4.3)
   - Set `Parent_Form__c` = rootFormId (from 4.1)
   - Insert the new Form

2. **Clone Question__c records:**
   - Query all Questions where `Form__c = sourceFormId`
   - For each Question, clone fields: `Title__c`, `Comment__c`, `Option__c`
   - Set `Form__c` = new Form's Id
   - Insert all cloned Questions

---

## 5. Implementation Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Form__c Detail Page Layout                                   │
│                                                              │
│  [ New Version ] ← Quick Action button                       │
│       │                                                      │
│       ▼                                                      │
│  ┌────────────────────────────────────┐                      │
│  │ Screen Flow: Form_Version_Manager  │ (opens as modal)     │
│  │                                    │                      │
│  │  Screen 1: formVersionHistory LWC  │                      │
│  │  ┌──────────────────────────────┐  │                      │
│  │  │ Version table + New Version  │  │                      │
│  │  │ links + navigation links     │  │                      │
│  │  └──────────────────────────────┘  │                      │
│  │         │                          │                      │
│  │         │ (user clicks             │                      │
│  │         │  "New Version")          │                      │
│  │         ▼                          │                      │
│  │  Invocable Apex Action:            │                      │
│  │  FormVersionCloneAction            │                      │
│  │  ┌──────────────────────────────┐  │                      │
│  │  │ 1. Find root form            │  │                      │
│  │  │ 2. Count existing versions   │  │                      │
│  │  │ 3. Clone Form__c             │  │                      │
│  │  │ 4. Clone Question__c records │  │                      │
│  │  │ 5. Return new Form Id        │  │                      │
│  │  └──────────────────────────────┘  │                      │
│  │         │                          │                      │
│  │         ▼                          │                      │
│  │  Screen 2: Success + Navigate      │                      │
│  │                                    │                      │
│  └────────────────────────────────────┘                      │
└──────────────────────────────────────────────────────────────┘
```

### Component Summary

| Component                      | Type             | Purpose                                                  |
|--------------------------------|------------------|----------------------------------------------------------|
| "New Version" button           | Quick Action     | Launches the Screen Flow as modal from Form__c page      |
| `Form_Version_Manager`         | Screen Flow      | Orchestrates: display version history → clone → navigate |
| `formVersionHistory`           | LWC (Flow screen)| Embedded in Flow screen; renders version table with hyperlinks |
| `FormVersionCloneAction`       | Invocable Apex   | Deep clones Form + Questions, sets version + parent      |

---

## 6. Screen Flow — `Form_Version_Manager`

### 6.1 Flow Properties

| Property        | Value                                  |
|-----------------|----------------------------------------|
| Type            | Screen Flow                            |
| Object          | Form__c                                |
| Trigger         | Quick Action on Form__c                |
| Input Variable  | `recordId` (Id — the current Form__c)  |

### 6.2 Flow Steps

```
START
  │
  ▼
[Get Records: Get_Current_Form]
  Query: SELECT Id, Parent_Form__c, Version__c FROM Form__c WHERE Id = :recordId
  │
  ▼
[Formula: Determine_Root_Form_Id]
  IF(Get_Current_Form.Parent_Form__c != null,
     Get_Current_Form.Parent_Form__c,
     Get_Current_Form.Id)
  │
  ▼
[Get Records: Get_All_Versions]
  Query: FROM Form__c
         WHERE Id = :rootFormId OR Parent_Form__c = :rootFormId
         ORDER BY Version__c ASC
  Store in: allVersions (collection)
  │
  ▼
[Screen 1: Version_History_Screen]
  Contains: formVersionHistory LWC component
  Passes: allVersions collection, recordId
  Output: selectedSourceFormId (Id — the form to clone from)
          userAction ('clone' | 'close')
  │
  ▼
[Decision: User_Action]
  If userAction == 'clone' → proceed to clone
  If userAction == 'close' → END
  │
  ▼
[Apex Action: Clone_Form_Version]
  Invocable: FormVersionCloneAction
  Input: sourceFormId = selectedSourceFormId
  Output: newFormId
  │
  ▼
[Screen 2: Success_Screen]
  Display: "Version created successfully!"
  Link: Navigate to new Form record (newFormId)
  │
  ▼
END
```

---

## 7. LWC Component — `formVersionHistory` (Flow Screen Component)

### 7.1 Component Location

`force-app/main/default/lwc/formVersionHistory/`

This is a **Flow Screen component** (target: `lightning__FlowScreen`). It receives the version collection from the flow and renders an interactive table.

### 7.2 Properties (Flow Input/Output)

```javascript
import { LightningElement, api } from 'lwc';
import { FlowAttributeChangeEvent, FlowNavigationNextEvent } from 'lightning/flowSupport';

export default class FormVersionHistory extends LightningElement {
    // Flow inputs
    @api versions = [];          // Collection of Form__c records from flow
    @api currentRecordId;        // The Form__c Id that launched the flow

    // Flow outputs
    @api selectedSourceFormId;   // The form Id to clone from
    @api userAction = '';        // 'clone' or 'close'
}
```

### 7.3 Template — Version Table

```html
<template>
    <div class="slds-text-heading_medium slds-m-bottom_medium">Version History</div>

    <lightning-datatable
        key-field="Id"
        data={versionRows}
        columns={columns}
        hide-checkbox-column
        onrowaction={handleRowAction}>
    </lightning-datatable>
</template>
```

### 7.4 Table Columns

| Column         | Type       | Behavior                                  |
|----------------|------------|-------------------------------------------|
| Version #      | url        | Hyperlink → navigates to `/lightning/r/Form__c/{Id}/view` |
| Created Date   | date       | Read-only display                         |
| Action         | button     | "New Version" link → triggers clone flow  |

```javascript
columns = [
    {
        label: 'Version #',
        fieldName: 'versionUrl',
        type: 'url',
        typeAttributes: { label: { fieldName: 'versionLabel' }, target: '_blank' }
    },
    {
        label: 'Created Date',
        fieldName: 'CreatedDate',
        type: 'date',
        typeAttributes: { year: 'numeric', month: 'short', day: '2-digit' }
    },
    {
        type: 'action',
        typeAttributes: {
            rowActions: [{ label: 'New Version', name: 'new_version' }]
        }
    }
];
```

### 7.5 Row Action Handler

```javascript
handleRowAction(event) {
    const action = event.detail.action;
    const row = event.detail.row;
    if (action.name === 'new_version') {
        this.selectedSourceFormId = row.Id;
        this.userAction = 'clone';
        // Notify flow of output changes
        this.dispatchEvent(new FlowAttributeChangeEvent('selectedSourceFormId', row.Id));
        this.dispatchEvent(new FlowAttributeChangeEvent('userAction', 'clone'));
        // Navigate to next flow screen (triggers clone)
        this.dispatchEvent(new FlowNavigationNextEvent());
    }
}
```

---

## 8. Invocable Apex — `FormVersionCloneAction`

### 8.1 Class Location

`force-app/main/default/classes/FormVersionCloneAction.cls`

### 8.2 Invocable Interface

```java
public with sharing class FormVersionCloneAction {

    public class Input {
        @InvocableVariable(required=true description='Id of the Form to clone from')
        public Id sourceFormId;
    }

    public class Output {
        @InvocableVariable(description='Id of the newly created Form version')
        public Id newFormId;
    }

    @InvocableMethod(label='Clone Form Version'
                     description='Deep clones a Form and its Questions, increments version, links to root')
    public static List<Output> cloneFormVersion(List<Input> inputs) {
        List<Output> results = new List<Output>();
        for (Input inp : inputs) {
            results.add(cloneSingle(inp.sourceFormId));
        }
        return results;
    }
```

### 8.3 Clone Logic

```java
    private static Output cloneSingle(Id sourceFormId) {
        Output result = new Output();

        // 1. Query source form
        Form__c source = [
            SELECT Id, Form_Title__c, Start_Date__c, End_Date__c,
                   Status__c, Objects__c, Version__c, Parent_Form__c
            FROM Form__c
            WHERE Id = :sourceFormId
            LIMIT 1
        ];

        // 2. Determine root form Id (Version 1)
        Id rootFormId = (source.Parent_Form__c != null)
                        ? source.Parent_Form__c
                        : source.Id;

        // 3. Count existing versions in the family
        Integer versionCount = [
            SELECT COUNT()
            FROM Form__c
            WHERE Id = :rootFormId OR Parent_Form__c = :rootFormId
        ];

        // 4. Clone Form__c
        Form__c newForm      = source.clone(false, true); // no Id, deep clone
        newForm.Version__c   = versionCount + 1;
        newForm.Parent_Form__c = rootFormId;
        newForm.Status__c    = 'Draft';
        insert newForm;

        // 5. Clone related Question__c records
        List<Question__c> sourceQuestions = [
            SELECT Title__c, Comment__c, Option__c
            FROM Question__c
            WHERE Form__c = :sourceFormId
        ];

        List<Question__c> clonedQuestions = new List<Question__c>();
        for (Question__c q : sourceQuestions) {
            Question__c cloned = q.clone(false, true);
            cloned.Form__c = newForm.Id;
            clonedQuestions.add(cloned);
        }
        if (!clonedQuestions.isEmpty()) {
            insert clonedQuestions;
        }

        result.newFormId = newForm.Id;
        return result;
    }
}
```

### 8.4 Key Design Decisions

| Decision | Rationale |
|---|---|
| `source.clone(false, true)` | `false` = don't preserve Id; `true` = deep clone (copies all field values) |
| `Status__c = 'Draft'` | New versions always start as Draft, regardless of source status |
| `Parent_Form__c = rootFormId` | ALL versions point to V1, not to the version they were cloned from |
| Version number = count + 1 | Guarantees uniqueness even if versions are deleted and recreated |

---

## 9. Quick Action — "New Version" Button

### 9.1 Metadata

**File:** `force-app/main/default/quickActions/Form__c.New_Version.quickAction-meta.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<QuickAction xmlns="http://soap.sforce.com/2006/04/metadata">
    <flowDefinition>Form_Version_Manager</flowDefinition>
    <label>New Version</label>
    <optionsCreateFeedItem>false</optionsCreateFeedItem>
    <type>Flow</type>
</QuickAction>
```

### 9.2 Page Layout Update

The Quick Action must be added to the Form__c page layout's `<platformActionList>` so it appears in the highlights panel on the record page. See section 14 for the full deployment checklist.

---

## 10. Acceptance Criteria Mapping

| #  | Acceptance Criteria (from Jira)                                                             | Implementation                                                                                        |
|----|---------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| 1  | "New Version" button on Form detail page opens Version History modal                        | Quick Action launches Screen Flow `Form_Version_Manager` as modal                                    |
| 2  | Modal shows all versions with Version #, Created Date, "New Version" link                   | `formVersionHistory` LWC renders `lightning-datatable` with version URL, date, and row action         |
| 3  | New version created with existing data and version incremented by 1                         | `FormVersionCloneAction` deep clones Form + Questions, sets `Version__c = count + 1`                 |
| 4  | Can navigate to respective Form version by clicking version number                          | Version # column is a URL type linking to `/lightning/r/Form__c/{Id}/view`                           |
| 5  | Version number on Details page is automatically updated                                     | `Version__c` is set during clone in Apex; no manual update needed                                    |
| 6  | All child related objects (Questions) copied to new version                                 | `FormVersionCloneAction` queries all `Question__c` where `Form__c = sourceFormId` and clones them    |
| 7  | All child form versions associated with parent form version (always version 1)              | `Parent_Form__c` always set to rootFormId (V1); root determined by null-check on `Parent_Form__c`    |

---

## 11. Files to Create / Modify

| File                                                                            | Action | Purpose                                            |
|---------------------------------------------------------------------------------|--------|----------------------------------------------------|
| `force-app/main/default/classes/FormVersionCloneAction.cls`                     | Create | Invocable Apex: deep clone Form + Questions        |
| `force-app/main/default/classes/FormVersionCloneAction.cls-meta.xml`            | Create | Apex metadata                                      |
| `force-app/main/default/lwc/formVersionHistory/formVersionHistory.html`         | Create | LWC template: version datatable                    |
| `force-app/main/default/lwc/formVersionHistory/formVersionHistory.js`           | Create | LWC controller: table columns, row action handler  |
| `force-app/main/default/lwc/formVersionHistory/formVersionHistory.js-meta.xml`  | Create | LWC metadata: target `lightning__FlowScreen`        |
| `force-app/main/default/flows/Form_Version_Manager.flow-meta.xml`              | Create | Screen Flow: orchestration                         |
| `force-app/main/default/quickActions/Form__c.New_Version.quickAction-meta.xml`  | Create | Quick Action: button on Form__c page               |
| `force-app/main/default/layouts/Form__c-Form Layout.layout-meta.xml`           | Modify | Add "New Version" to `platformActionList` section  |
| `force-app/main/default/permissionsets/Form_Version_Access.permissionset-meta.xml` | Create | Permission Set: Apex class + object/field access for non-admin users |

---

## 12. Edge Cases

| Scenario                                      | Behavior                                                     |
|-----------------------------------------------|--------------------------------------------------------------|
| Form has no Version__c value (null)           | Treat as Version 1. Set `Version__c = 1` on the root form if null before counting. |
| Form has no Questions                         | Clone Form only. Skip Question clone step (empty list).      |
| User clicks "New Version" on the root form    | Clone from root. `Parent_Form__c = root.Id`, `Version__c = 2`. |
| User clicks "New Version" on a child version  | Clone from child. `Parent_Form__c` still = root.Id (V1).    |
| Multiple users create version simultaneously  | Each gets `count + 1` at query time. Minor risk of duplicate version numbers — acceptable. Use `FOR UPDATE` on count query if strict ordering required. |

---

## 13. Dependencies

- `Form__c` object with `Version__c` (Number) and `Parent_Form__c` (Self-lookup) fields — already deployed
- `Question__c` object with `Form__c` (Lookup) field — already deployed
- Screen Flows must be enabled in the org
- Quick Actions must be enabled on the Form__c page layout
- LWC Flow Screen components require API version 59.0+

---

## 14. Deployment & Configuration Checklist

Complete these steps in order after all code artifacts are created.

### 14.1 Deploy Code Artifacts

Deploy in dependency order:

| Step | What to deploy                                     | Command / Method                                                |
|------|----------------------------------------------------|-----------------------------------------------------------------|
| 1    | `FormVersionCloneAction.cls` + `.cls-meta.xml`     | `sf project deploy start --source-dir force-app/main/default/classes/FormVersionCloneAction.cls` |
| 2    | `formVersionHistory` LWC (all files)               | `sf project deploy start --source-dir force-app/main/default/lwc/formVersionHistory` |
| 3    | `Form_Version_Manager` Screen Flow                 | `sf project deploy start --source-dir force-app/main/default/flows/Form_Version_Manager.flow-meta.xml` |
| 4    | `Form__c.New_Version` Quick Action                 | `sf project deploy start --source-dir force-app/main/default/quickActions/Form__c.New_Version.quickAction-meta.xml` |
| 5    | Updated `Form__c-Form Layout` page layout          | Deploy via MCP or `sf project deploy start`                     |

### 14.2 Activate the Screen Flow

The Screen Flow must be activated before the Quick Action can invoke it.

- **Via Setup:** Setup → Flows → `Form_Version_Manager` → Activate
- **Via metadata:** Ensure `<status>Active</status>` in the `.flow-meta.xml` file before deploying

If the flow is deployed as Inactive (draft), the "New Version" button will show an error.

### 14.3 Add Quick Action to Page Layout

The Form__c page layout must include the Quick Action in its `<platformActionList>` section. This controls which buttons appear in the highlights panel on the Lightning Record Page.

**Layout metadata change** — add to `Form__c-Form Layout.layout-meta.xml`:

```xml
<platformActionList>
    <platformActionListItems>
        <actionName>Form__c.New_Version</actionName>
        <actionType>QuickAction</actionType>
        <sortOrder>0</sortOrder>
    </platformActionListItems>
    <platformActionListItems>
        <actionName>Edit</actionName>
        <actionType>StandardButton</actionType>
        <sortOrder>1</sortOrder>
    </platformActionListItems>
    <platformActionListItems>
        <actionName>Delete</actionName>
        <actionType>StandardButton</actionType>
        <sortOrder>2</sortOrder>
    </platformActionListItems>
</platformActionList>
```

Alternatively, add via Lightning App Builder:
1. Open the Form__c record page in Lightning App Builder
2. Click the highlights panel
3. In the right sidebar, click "Add Action"
4. Search for "New Version" and add it
5. Save and Activate the page

### 14.4 Lightning Record Page Assignment

If a **custom Lightning Record Page** is used for Form__c:
- Ensure the **Highlights Panel** component is present on the page (Quick Actions render inside it)
- Assign the page as org default for Form__c: Lightning App Builder → Activation → Org Default

If using the **default record page** (no custom page):
- The highlights panel is included automatically; the Quick Action will appear after the layout is deployed

### 14.5 Profile / Permission Set — Apex Class Access

Internal users must have access to the `FormVersionCloneAction` Apex class. Without this, the Flow will throw a runtime error at the Apex action step.

**Option A — Admin Profile (already has access):**
System Administrators have "Author Apex" permission which grants access to all Apex classes. No action needed.

**Option B — Non-Admin Profiles:**
Create or update a Permission Set:

```xml
<!-- force-app/main/default/permissionsets/Form_Version_Access.permissionset-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<PermissionSet xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>Form Version Access</label>
    <description>Grants access to Form versioning Quick Action, Flow, and Apex</description>
    <classAccesses>
        <apexClass>FormVersionCloneAction</apexClass>
        <enabled>true</enabled>
    </classAccesses>
    <objectPermissions>
        <allowCreate>true</allowCreate>
        <allowDelete>false</allowDelete>
        <allowEdit>true</allowEdit>
        <allowRead>true</allowRead>
        <modifyAllRecords>false</modifyAllRecords>
        <object>Form__c</object>
        <viewAllRecords>true</viewAllRecords>
    </objectPermissions>
    <objectPermissions>
        <allowCreate>true</allowCreate>
        <allowDelete>false</allowDelete>
        <allowEdit>true</allowEdit>
        <allowRead>true</allowRead>
        <modifyAllRecords>false</modifyAllRecords>
        <object>Question__c</object>
        <viewAllRecords>true</viewAllRecords>
    </objectPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>Form__c.Version__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>Form__c.Parent_Form__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>Form__c.Form_Title__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>Form__c.Start_Date__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>Form__c.End_Date__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>Form__c.Status__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>Form__c.Objects__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>Question__c.Title__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>Question__c.Comment__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>Question__c.Option__c</field>
        <readable>true</readable>
    </fieldPermissions>
    <fieldPermissions>
        <editable>true</editable>
        <field>Question__c.Form__c</field>
        <readable>true</readable>
    </fieldPermissions>
</PermissionSet>
```

After deploying the Permission Set, assign it to the target users/profiles:

```bash
sf org assign permset --name Form_Version_Access --target-org anmol.bali@tavant.com.pd-tt
```

### 14.6 Flow Access for Non-Admin Users

If the org restricts Flow access by profile:
- Setup → Flows → `Form_Version_Manager` → View Details → Add Profile/Permission Set access
- Or ensure the user's profile has "Run Flows" permission enabled

Admin profiles have this by default.

### 14.7 One-Time Data Fix — Initialize Version__c on Existing Records

Existing Form__c records were created before the versioning feature. Their `Version__c` field is null. The Apex clone logic handles null by treating it as Version 1 (see section 12 — Edge Cases), but for clean data display in the modal, run a one-time update:

```sql
-- Find forms with null Version__c
SELECT Id, Name, Version__c FROM Form__c WHERE Version__c = null
```

```java
// One-time anonymous Apex script
List<Form__c> forms = [SELECT Id FROM Form__c WHERE Version__c = null];
for (Form__c f : forms) {
    f.Version__c = 1;
}
update forms;
```

This ensures the version history modal shows "Version 1" instead of blank for pre-existing records.

### 14.8 Deployment Order Summary

```
Step 1:  Deploy Apex class (FormVersionCloneAction)
Step 2:  Deploy LWC (formVersionHistory)
Step 3:  Deploy + Activate Screen Flow (Form_Version_Manager)
Step 4:  Deploy Quick Action (Form__c.New_Version)
Step 5:  Update + Deploy Page Layout (add Quick Action to platformActionList)
Step 6:  (Optional) Deploy Permission Set (Form_Version_Access)
Step 7:  (Optional) Assign Permission Set to users
Step 8:  (Optional) Assign Lightning Record Page if using custom page
Step 9:  Run one-time data fix for existing records with null Version__c
Step 10: Verify: Open a Form record → click "New Version" → confirm modal + clone
```
