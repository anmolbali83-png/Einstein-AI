# TDD: MP-5 — Support Cases: Case Information Section

| Field          | Value                                        |
|----------------|----------------------------------------------|
| Jira           | MP-5                                         |
| Title          | Support Cases - Case Information              |
| Case Type      | Parts Technical Help                         |
| Status         | To Do                                        |
| Reporter       | Anmol Bali                                   |
| Assignee       | Suman Saha                                   |
| Scope          | Case Information section on Case create UI   |

---

## 1. Overview

The **Case Information** section captures failure classification (Main Area / Sub Area), urgency (Priority / Severity), and the problem narrative (Problem Description / Actions Taken by Dealer). Sub Area is a dependent picklist filtered by Main Area. This section sits below the Product Information section (MP-4) in the `caseCreate` LWC component, and shares the same Apex controller — `CaseCreateController`.

---

## 2. UI Layout (from Mockup)

Four-column grid, two rows inside a collapsible "Case Information" section.

```
Row 1:  MAIN AREA          | SUB AREA           | PRIORITY *        | SEVERITY *
        (picklist,optional) | (dependent,optional)| (picklist,required)| (picklist,required)

Row 2:  PROBLEM DESCRIPTION *                    | ACTIONS TAKEN BY DEALER
        (textarea, required, 500 char max)        | (textarea, optional)
```

### Mockup vs Story Discrepancy

The mockup shows red asterisks (*) on ALL six fields. However, the story description explicitly states (in bold):

> **"Verify that Main Area, Sub Area, and Actions taken by dealer are Optional fields."**

This TDD follows the **story description** (3 mandatory, 3 optional). If the mockup is the source of truth, update the Required column in section 5 accordingly.

---

## 3. Data Model — Case Fields

All fields in this section are stored directly on the Case object. No cross-object data retrieval is required (unlike the Product Information section).

```
Case
 |-- Global_Main_Area__c ........ Picklist (controlling field)
 |-- Global_Sub_Area__c ......... Picklist (dependent on Global_Main_Area__c)
 |-- Priority ................... Standard Picklist (custom values)
 |-- Severity__c ................ Picklist (NEW — to be created)
 |-- Problem_Description__c ..... LongTextArea (NEW — to be created, 500 char max)
 |-- Actions_Taken_By_Dealer__c . LongTextArea (existing, 32768 chars)
```

---

## 4. Field Inventory

### 4.1 Existing fields (already deployed)

| # | Case Field API Name          | Type           | Notes                                                       |
|---|------------------------------|----------------|-------------------------------------------------------------|
| 1 | `Global_Main_Area__c`        | Picklist       | Current values: Aftermarket Technologies (500.034), Axles/Drawbars/Auto Pickup Hitches (000.001), Body/Chassis & Frame (100.002). Extend as needed. |
| 2 | `Global_Sub_Area__c`         | Picklist       | Dependent on `Global_Main_Area__c`. Controlled via `valueSettings`. Current values include 4WD Clutch/Coupler Systems (0101), Brake System Air (0105), Axle Shafts/Bearings/Seals (0102/0103), Frame/Mounts/Wings (0205), etc. |
| 3 | `Priority`                   | Standard Picklist | Standard Case field. Values to be configured: 1-Critical, 2-High, 3-Medium, 4-Low. |
| 4 | `Actions_Taken_By_Dealer__c` | LongTextArea(32768) | Existing. 5 visible lines.                               |

### 4.2 New fields (to be created)

| # | Case Field API Name          | Type                | Values / Constraints                                                                 |
|---|------------------------------|---------------------|--------------------------------------------------------------------------------------|
| 5 | `Severity__c`                | Picklist            | A-Machine Immobilized, B-Impaired Functionality, C-Nuisance, D-Suitability for Intended purpose |
| 6 | `Problem_Description__c`     | LongTextArea(500)   | 500 character max. visibleLines: 5.                                                  |

---

## 5. Field Behavior Rules

| Field                   | API Name                    | Required | Editable | Behavior                                                                                    |
|-------------------------|-----------------------------|----------|----------|---------------------------------------------------------------------------------------------|
| Main Area               | `Global_Main_Area__c`       | No       | Yes      | Picklist. When changed, Sub Area resets to blank and refreshes its options.                 |
| Sub Area                | `Global_Sub_Area__c`        | No       | Yes      | Dependent picklist. Options filtered by selected Main Area. Disabled when Main Area is blank.|
| Priority                | `Priority`                  | Yes (*)  | Yes      | Picklist. Values: 1-Critical, 2-High, 3-Medium, 4-Low.                                    |
| Severity                | `Severity__c`               | Yes (*)  | Yes      | Picklist. Values: A-Machine Immobilized, B-Impaired Functionality, C-Nuisance, D-Suitability for Intended purpose. |
| Problem Description     | `Problem_Description__c`    | Yes (*)  | Yes      | LongTextArea. 500 character max. Show remaining character count in UI.                     |
| Actions Taken by Dealer | `Actions_Taken_By_Dealer__c`| No       | Yes      | LongTextArea. Free-text, no character limit enforced in UI (field allows 32768).           |

---

## 6. Dependent Picklist — Main Area / Sub Area

The dependency is already defined in the `Global_Sub_Area__c` field metadata via `<controllingField>Global_Main_Area__c</controllingField>` and `<valueSettings>` mappings.

### Current dependency map (from source):

| Main Area (controlling)                          | Sub Area (dependent)                    |
|--------------------------------------------------|-----------------------------------------|
| Aftermarket Technologies (500.034)               | 4WD Clutch/Coupler Systems (0101)       |
| Aftermarket Technologies (500.034)               | Brake System Air (0105)                 |
| Axles/Drawbars/Auto Pickup Hitches (000.001)     | Axle Shafts/Bearings/Seals (0102)       |
| Axles/Drawbars/Auto Pickup Hitches (000.001)     | Axle Shafts/Bearings/Seals (0103)       |
| Body/Chassis & Frame (100.002)                   | Frame/Mounts/Wings (0205)               |
| Body/Chassis & Frame (100.002)                   | Implement Drawbars/Hitches (0208)       |

### LWC Implementation Approach

Use `getPicklistValuesByRecordType` wire adapter from `lightning/uiObjectInfoApi` to retrieve all picklist values with dependency metadata in one call. Build the dependency map client-side:

```javascript
import { getPicklistValuesByRecordType } from 'lightning/uiObjectInfoApi';
import CASE_OBJECT from '@salesforce/schema/Case';

@wire(getPicklistValuesByRecordType, {
    objectApiName: CASE_OBJECT,
    recordTypeId: '$recordTypeId'
})
wiredPicklists({ data, error }) {
    if (data) {
        const picklistValues = data.picklistFieldValues;
        this.mainAreaOptions   = this.buildOptions(picklistValues.Global_Main_Area__c);
        this.priorityOptions   = this.buildOptions(picklistValues.Priority);
        this.severityOptions   = this.buildOptions(picklistValues.Severity__c);
        // Store full dependency map for Sub Area
        this.subAreaDependencyMap = this.buildDependencyMap(
            picklistValues.Global_Sub_Area__c
        );
    }
}
```

When Main Area changes:

```javascript
handleMainAreaChange(event) {
    this.mainArea = event.detail.value;
    this.subArea = '';  // reset
    this.subAreaOptions = this.subAreaDependencyMap[this.mainArea] || [];
}
```

---

## 7. Shared Apex Controller — `CaseCreateController`

This section shares the controller with MP-4 (Product Information). All methods live in one class.

### Full method inventory (MP-4 + MP-5):

| Method                                        | Source Story | Purpose                                              |
|-----------------------------------------------|-------------|------------------------------------------------------|
| `getProductInfoFromAsset(String serialNumber)` | MP-4        | Asset lookup → Product Information auto-population   |
| `getPartDescription(Id partId)`                | MP-4        | Part lookup → Part Description auto-population       |
| `saveCaseAsDraft(Case caseRecord)`             | MP-4 + MP-5 | Persist Case with all section data, Status = Draft   |
| `submitCase(Id caseId)`                        | MP-5        | Transition Case from Draft to Submitted              |

### 7.1 `saveCaseAsDraft` — updated for Case Information fields

This method was introduced in MP-4 but now also persists Case Information fields. The LWC builds the full Case sObject including both sections before calling this method.

```java
@AuraEnabled
public static Id saveCaseAsDraft(Case caseRecord) {
    // Enforce field-level access
    caseRecord.Status = 'Draft';
    upsert caseRecord;
    return caseRecord.Id;
}
```

The LWC is responsible for populating all fields on the Case sObject before calling this method. No section-specific logic lives in Apex — the controller is a thin persistence layer.

### 7.2 `submitCase` — new for MP-5

Called when the user clicks **Submit**. Validates mandatory fields and changes Status.

```java
@AuraEnabled
public static void submitCase(Id caseId) {
    Case c = [SELECT Id, Priority, Severity__c, Problem_Description__c,
                     AssetId
              FROM Case WHERE Id = :caseId WITH USER_MODE LIMIT 1];

    // Validate mandatory fields
    List<String> errors = new List<String>();
    if (String.isBlank(c.Priority))              errors.add('Priority is required');
    if (String.isBlank(c.Severity__c))           errors.add('Severity is required');
    if (String.isBlank(c.Problem_Description__c)) errors.add('Problem Description is required');

    if (!errors.isEmpty()) {
        throw new AuraHandledException(String.join(errors, '; '));
    }

    c.Status = 'Submitted';
    update c;
}
```

---

## 8. LWC Component — `caseCreate`

### 8.1 Component Location

`force-app/main/default/lwc/caseCreate/` (same component as MP-4)

### 8.2 New Properties for Case Information Section

```javascript
// Picklist options (populated from wire)
mainAreaOptions = [];
subAreaOptions = [];
priorityOptions = [];
severityOptions = [];
subAreaDependencyMap = {};

// Field values
mainArea = '';
subArea = '';
priority = '';
severity = '';
problemDescription = '';
actionsTakenByDealer = '';

// Validation
get isSubAreaDisabled() {
    return !this.mainArea;
}

get problemDescriptionRemaining() {
    return 500 - (this.problemDescription?.length || 0);
}
```

### 8.3 Wire / Imperative Calls (Case Information section only)

| Trigger                        | Method / Adapter                        | Action                                                   |
|-------------------------------|-----------------------------------------|----------------------------------------------------------|
| Component connected            | `@wire getPicklistValuesByRecordType`   | Populate all picklist options + build Sub Area dependency map |
| Main Area change               | (client-side)                           | Reset Sub Area, filter Sub Area options from dependency map |
| Save button click              | `saveCaseAsDraft` (Apex imperative)     | Persist all fields from all sections                     |
| Submit button click            | `submitCase` (Apex imperative)          | Server-side validation + status transition               |

### 8.4 Validation Rules (client-side, before Save/Submit)

| When        | Validate                                                         |
|-------------|------------------------------------------------------------------|
| Save        | Asset/Serial Number required (MP-4 scope)                        |
| Submit      | Asset required + Priority + Severity + Problem Description       |
| Always      | Problem Description max 500 characters (enforce via `maxlength`) |
| Always      | Sub Area disabled when Main Area is blank                        |

---

## 9. Case Field Assignment on Save

When Save or Submit is clicked, the LWC builds ONE Case sObject with fields from ALL sections:

```javascript
const caseRecord = {
    // --- MP-4: Product Information ---
    RecordTypeId:               this.recordTypeId,
    AssetId:                    this.assetId,
    Brand__c:                   this.brand,
    Machine_Type__c:            this.machineType,
    Series__c:                  this.series,
    Model_Number__c:            this.modelNumber,
    Unit_of_Measure__c:         this.unitOfMeasure,
    Machine_Usage__c:           this.machineUsage,
    Used_With__c:               this.usedWith,
    Engine_Serial_Number__c:    this.engineSerial,
    Part_Number__c:             this.partNumberId,
    Part_Description__c:        this.partDescription,
    No_Causal_Part_Reason__c:   this.noPartReason,

    // --- MP-5: Case Information ---
    Global_Main_Area__c:        this.mainArea,
    Global_Sub_Area__c:         this.subArea,
    Priority:                   this.priority,
    Severity__c:                this.severity,
    Problem_Description__c:     this.problemDescription,
    Actions_Taken_By_Dealer__c: this.actionsTakenByDealer
};
```

---

## 10. Acceptance Criteria Mapping

| #  | Acceptance Criteria (from Jira)                                                      | Implementation                                                                                  |
|----|--------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| 1  | Provide case information: Main Area, Sub Area, Priority, Severity, Problem Desc, Actions | All 6 fields rendered in the Case Information section                                          |
| 2  | Sub Areas filtered by Main Area                                                       | `getPicklistValuesByRecordType` wire + client-side dependency map; Sub Area resets on Main Area change |
| 3  | Priority values: 1-Critical, 2-High, 3-Medium, 4-Low — mandatory                    | Standard `Priority` picklist with custom values; `required` attribute on `lightning-combobox`   |
| 4  | Severity values: A-Machine Immobilized, B-Impaired Functionality, C-Nuisance, D-Suitability — mandatory | New `Severity__c` picklist; `required` attribute on `lightning-combobox`                        |
| 5  | Problem Description mandatory, 500 char max                                           | `Problem_Description__c` LongTextArea(500); `required` + `maxlength="500"` on `lightning-textarea`; show remaining character count |
| 6  | Actions Taken by Dealer optional                                                      | `Actions_Taken_By_Dealer__c` LongTextArea; no `required` attribute                             |
| 7  | Priority, Severity, Problem Description are mandatory                                 | `required` attribute in HTML + server-side validation in `submitCase`                           |
| 8  | Main Area, Sub Area, Actions Taken by Dealer are optional                             | No `required` attribute; note mockup discrepancy (see section 2)                               |
| 9  | Save as Draft                                                                         | `saveCaseAsDraft` persists with `Status = 'Draft'`, no mandatory field validation on save      |

---

## 11. New Metadata to Create

| File                                                                  | Action | Purpose                                        |
|-----------------------------------------------------------------------|--------|-------------------------------------------------|
| `force-app/main/default/objects/Case/fields/Severity__c.field-meta.xml` | Create | Picklist: A-Machine Immobilized, B-Impaired Functionality, C-Nuisance, D-Suitability for Intended purpose |
| `force-app/main/default/objects/Case/fields/Problem_Description__c.field-meta.xml` | Create | LongTextArea(500), visibleLines 5               |

### Priority picklist customization

The standard `Case.Priority` field needs its picklist values updated to: `1-Critical`, `2-High`, `3-Medium`, `4-Low`. This is configured via Setup > Object Manager > Case > Fields > Priority > Edit values, or by deploying a `StandardValueSet` for `CasePriority`.

---

## 12. Files to Create / Modify

| File                                                                        | Action | Purpose                                              |
|-----------------------------------------------------------------------------|--------|------------------------------------------------------|
| `force-app/main/default/objects/Case/fields/Severity__c.field-meta.xml`     | Create | Severity picklist field                              |
| `force-app/main/default/objects/Case/fields/Problem_Description__c.field-meta.xml` | Create | Problem Description textarea (500 char max)         |
| `force-app/main/default/classes/CaseCreateController.cls`                   | Modify | Add `submitCase` method (shared controller with MP-4)|
| `force-app/main/default/lwc/caseCreate/caseCreate.html`                    | Modify | Wire Case Information fields, dependent picklist     |
| `force-app/main/default/lwc/caseCreate/caseCreate.js`                      | Modify | Add picklist wire, dependency map, validation logic  |

---

## 13. Dependencies

- All MP-4 dependencies (Asset, Model__c, Brand__c, Product2, Part__c)
- `Severity__c` and `Problem_Description__c` fields must be deployed before LWC implementation
- Standard `Case.Priority` picklist values must be configured with story-specific values
- `Global_Main_Area__c` / `Global_Sub_Area__c` dependent picklist configuration must be complete with all production values (current source only has 3 Main Areas and 6 Sub Areas — may need expansion)
- `RecordType` for "Parts Technical Help" must exist on Case for `getPicklistValuesByRecordType` wire to return correct values

---

## 14. Cross-Story Reference

| Story | Section              | Shared Artifact                    |
|-------|----------------------|------------------------------------|
| MP-4  | Product Information  | `CaseCreateController.cls`, `caseCreate` LWC |
| MP-5  | Case Information     | `CaseCreateController.cls`, `caseCreate` LWC |

Both stories contribute methods to **one** `CaseCreateController` and **one** `caseCreate` LWC component. The `saveCaseAsDraft` method persists fields from both sections in a single DML call.
