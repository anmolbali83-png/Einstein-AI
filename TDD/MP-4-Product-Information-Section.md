# TDD: MP-4 — Support Cases: Product Information Section

| Field          | Value                                        |
|----------------|----------------------------------------------|
| Jira           | MP-4                                         |
| Title          | Support Cases - Product Information           |
| Case Type      | Parts Technical Help                         |
| Status         | To Do                                        |
| Reporter       | Anmol Bali                                   |
| Assignee       | Suman Saha                                   |
| Scope          | Product Information section on Case create UI |

---

## 1. Overview

When a user creates a "Parts Technical Help" support case and provides a Serial Number, the **Product Information** section auto-populates equipment and product fields from the related Asset record. Some fields are disabled text inputs (derived from Asset — rendered with input borders, not as labels), some are conditionally editable, and some are fully manual. On save, **only Product Information fields** are persisted to the Case and the returned Case Number is displayed under the Case Record Type (Parts Technical) on UI.

> **Scope:** This story covers the Product Information section **only**. Other sections (Case Information, Dealer, Comments, etc.) remain as static UI shells and are wired in their own stories (e.g. MP-5 for Case Information).

---

## 2. UI Layout (from Mockup)

The MP-4 page contains **only** these elements — no other sections exist:

```
┌─────────────────────────────────────────────────────────────────┐
│  (dark bar)          Create a Support Case                      │
├─────────────────────────────────────────────────────────────────┤
│  Parts Technical Help              ★ Add Favorite  Copy  Print  │
│  1247008                           * = Required Information     │
│  Status                                                         │
│  New                                                            │
├─────────────────────────────────────────────────────────────────┤
│  ▼ Asset /Serial Number Information                             │
│    [Toggle] Asset/Serial Number Not Applicable                  │
│    ASSET/SERIAL NUMBER *  [ text input ]  Clear Search (link)   │
│    ✅ VIN/Serial Number found. Product information has been     │
│       added below.                                              │
├─────────────────────────────────────────────────────────────────┤
│  ▼ Product Information                                          │
│    Row 1: BRAND *  |  MACHINE TYPE *  |  SERIES *  | MODEL #*  │
│    Row 2: UoM      |  MACHINE USAGE   |  USED WITH | ENG SER#  │
│    Row 3: PART #   |  PART DESC       |  NO PART REASON         │
├─────────────────────────────────────────────────────────────────┤
│  [ Save (red) ]  [ Submit ]  [ Resolve ]  [ Cancel ]           │
└─────────────────────────────────────────────────────────────────┘
```

All asset-populated fields render as `lightning-input` text fields with visible input borders. They do **not** use `read-only` (which renders as plain-text labels without borders).

**Footer buttons:** Save (primary/red filled), Submit (outlined), Resolve (outlined), Cancel (outlined)

---

## 3. Data Model — Entity Relationships

```
Case (standard + custom fields)
 |
 |-- AssetId (standard Lookup --> Asset)
 |     |
 |     |-- Asset.Model_Name__c (Lookup --> Model__c)
 |     |     |-- Model__c.Name  .................. --> Case.Model_Number__c
 |     |     |-- Model__c.Brand_Name__c (Lookup --> Brand__c)
 |     |           |-- Brand__c.Name  ............ --> Case.Brand__c
 |     |
 |     |-- Asset.Machine_Type__c (Formula)  ...... --> Case.Machine_Type__c
 |     |-- Asset.Series__c (Formula)  ............ --> Case.Series__c
 |     |-- Asset.Unit_of_Measure__c (Picklist) ... --> Case.Unit_of_Measure__c
 |     |-- Asset.Usage__c (Number 18,0) .......... --> Case.Machine_Usage__c
 |     |-- Asset.Engine_Serial_Number__c (Text 80) -> displayed on UI (not saved to Case)
 |
 |-- Part_Number__c (Lookup --> Part__c)
       |-- Part__c.Name (Text, labeled "Part Number")
       |-- Part__c.Part_Description__c (Text 255) -> Case.Part_Description__c
```

**Key:** `Machine_Type__c` and `Series__c` are formula fields on Asset that resolve `Product2.Type__c` and `Product2.Series__c` respectively. The SOQL query reads them directly from Asset — no Product2 join is needed.

---

## 4. Field Mapping — Asset to Case

### 4.1 Auto-populated from Asset (on Serial Number search via `findAssetBySerial`)

| #  | UI Label         | Asset Source Field                    | Case Field API Name          |
|----|------------------|---------------------------------------|------------------------------|
| 1  | (hidden)         | `Id`                                  | `AssetId`                    |
| 2  | Brand            | `Model_Name__r.Brand_Name__r.Name`    | `Brand__c`                   |
| 3  | Machine Type     | `Machine_Type__c` (formula)           | `Machine_Type__c`            |
| 4  | Series           | `Series__c` (formula)                 | `Series__c`                  |
| 5  | Model Number     | `Model_Name__r.Name`                  | `Model_Number__c`            |
| 6  | Unit of Measure  | `Unit_of_Measure__c`                  | `Unit_of_Measure__c`         |
| 7  | Machine Usage    | `Usage__c` (Number → String)          | `Machine_Usage__c`           |
| 8  | Engine Serial #  | `Engine_Serial_Number__c`             | _(displayed on UI only, not saved to Case)_ |

### 4.2 Auto-populated from Part (on Part Number selection)

| #  | UI Label         | Source                                | Case Field API Name          |
|----|------------------|---------------------------------------|------------------------------|
| 9  | Part Description | `Part__c.Part_Description__c`         | `Part_Description__c`        |

### 4.3 Manual entry (no auto-population)

| #  | UI Label          | Case Field API Name          | Notes                                      |
|----|-------------------|------------------------------|--------------------------------------------|
| 10 | Part Number       | `Part_Number__c`             | Optional, lookup to Part__c                |
| 11 | Part Description  | `Part_Description__c`        | Auto-populated from Part, read-only        |
| 12 | No Part Reason    | `No_Causal_Part_Reason__c`   | Picklist: No Fault Found, Legacy Part, Missing Part |
| 13 | Used With         | `Used_With__c`               | Optional, free-text entry                  |

### 4.4 Complete Save Mapping (UI / Asset → Case)

This is the definitive field mapping when the user clicks **Save**:

| UI / Asset Field   | Case Field API Name          |
|--------------------|------------------------------|
| Serial Number      | `AssetId`                    |
| Model Name         | `Model_Number__c`            |
| Brand              | `Brand__c`                   |
| Series             | `Series__c`                  |
| Machine Type       | `Machine_Type__c`            |
| Unit of Measure    | `Unit_of_Measure__c`         |
| Usage              | `Machine_Usage__c`           |
| Part Number        | `Part_Number__c`             |
| Part Description   | `Part_Description__c`        |
| No Part Reason     | `No_Causal_Part_Reason__c`   |
| Used With          | `Used_With__c`               |

---

## 5. Field Behavior Rules

### 5.1 Row 1 — Equipment Identity (all required, disabled text inputs after Asset lookup)

| Field          | Required | Editable | Render As       | Behavior                                                        |
|----------------|----------|----------|-----------------|------------------------------------------------------------------|
| Brand          | Yes (*)  | No       | Disabled text input | Populated when Asset is found. Cleared on Clear Search.       |
| Machine Type   | Yes (*)  | No       | Disabled text input | Populated when Asset is found. Cleared on Clear Search.       |
| Series         | Yes (*)  | No       | Disabled text input | Populated when Asset is found. Cleared on Clear Search.       |
| Model Number   | Yes (*)  | No       | Disabled text input | Populated when Asset is found. Cleared on Clear Search.       |

### 5.2 Row 2 — Usage Info

| Field            | Required | Editable    | Render As         | Behavior                                                                          |
|------------------|----------|-------------|-------------------|-----------------------------------------------------------------------------------|
| Unit of Measure  | No       | No          | Disabled text input | Auto-populated from Asset.Unit_of_Measure__c if available.                       |
| Machine Usage    | No       | Conditional | Disabled text input if Asset.Usage__c has a value; editable text input if null/blank | Auto-populated if available. |
| Used With        | No       | Yes         | Editable text input | Always editable. Free-text entry. Not sourced from Asset.                       |
| Engine Serial #  | No       | No          | Disabled text input | Auto-populated from Asset.Engine_Serial_Number__c. Displayed on UI only, not saved to Case. |

### 5.3 Row 3 — Part Information

| Field            | Required | Editable | Render As          | Behavior                                                                          |
|------------------|----------|----------|--------------------|-----------------------------------------------------------------------------------|
| Part Number      | No       | Yes      | `lightning-record-picker` | Lookup to Part__c with search. Retained even if Part not found in system. |
| Part Description | No       | No       | Disabled text input | Auto-populated from Part__c.Part_Description__c when Part Number is selected. Blank if no Part selected. |
| No Part Reason   | No       | Yes      | Combobox (picklist) | Picklist selection. Independent of other fields.                                |

---

## 6. Apex Controller — `CaseCreateController`

One shared controller handles the entire `caseCreate` component end-to-end. All sections (Product Information, Case Information, and any future sections) contribute methods to this single class. The controller is a **thin service layer** — the LWC owns field assembly and client-side validation; the controller owns server queries and persistence.

**File:** `force-app/main/default/classes/CaseCreateController.cls`

### 6.1 Method Inventory (MP-4 scope)

| Method                                         | Purpose                                                              | Story |
|------------------------------------------------|----------------------------------------------------------------------|-------|
| `findAssetBySerial(String serialNumber)`        | Searches Asset by serial number, returns asset data wrapper          | MP-4  |
| `getPartDescription(Id partId)`                 | Returns Part_Description__c for a Part__c record                     | MP-4  |
| `saveCaseAsDraft(Case caseRecord)`              | Upserts Case with Status = Draft, returns caseId + CaseNumber       | MP-4  |
| `submitCase(Id caseId)`                         | Server-side mandatory field validation + Status transition           | MP-5 (future) |

### 6.2 Method: `findAssetBySerial(String serialNumber)` — this story

Called when a valid Serial Number is entered and confirmed (Enter/Tab). Returns a wrapper with all product information fields.

**SOQL query (exact):**

```sql
SELECT Id,
       Engine_Serial_Number__c,
       Machine_Type__c,
       Series__c,
       Model_Name__c,
       Model_Name__r.Name,
       Model_Name__r.Brand_Name__r.Name,
       Unit_of_Measure__c,
       Usage__c
FROM Asset
WHERE SerialNumber = :serialNumber
LIMIT 1
```

**Return wrapper structure:**

```java
public class AssetWrapper {
    @AuraEnabled public Id assetId;                // Asset.Id → Case.AssetId
    @AuraEnabled public String brand;              // Model_Name__r.Brand_Name__r.Name
    @AuraEnabled public String machineType;        // Machine_Type__c (formula field)
    @AuraEnabled public String series;             // Series__c (formula field)
    @AuraEnabled public String modelNumber;        // Model_Name__r.Name
    @AuraEnabled public String unitOfMeasure;      // Unit_of_Measure__c
    @AuraEnabled public String machineUsage;       // String.valueOf(Usage__c) or null
    @AuraEnabled public Boolean usageAvailable;    // Usage__c != null
    @AuraEnabled public String engineSerial;       // Engine_Serial_Number__c (UI display only)
}
```

**Mapping logic in Apex:**

```java
AssetWrapper info   = new AssetWrapper();
info.assetId        = asset.Id;
info.brand          = asset.Model_Name__r?.Brand_Name__r?.Name;
info.machineType    = asset.Machine_Type__c;
info.series         = asset.Series__c;
info.modelNumber    = asset.Model_Name__r?.Name;
info.unitOfMeasure  = asset.Unit_of_Measure__c;
info.machineUsage   = asset.Usage__c != null
                      ? String.valueOf(asset.Usage__c.intValue()) : null;
info.usageAvailable = asset.Usage__c != null;
info.engineSerial   = asset.Engine_Serial_Number__c;
```

### 6.3 Method: `getPartDescription(Id partId)` — this story

Called when Part Number lookup value changes. Returns Part Description.

```sql
SELECT Id, Part_Description__c
FROM Part__c
WHERE Id = :partId
LIMIT 1
```

### 6.4 Method: `saveCaseAsDraft(Case caseRecord)` — this story

The LWC builds a Case sObject containing **only Product Information fields** (the 11 fields from section 4.4) and passes it to this method. Returns both the Case Id (for subsequent upserts) and the Case Number (for UI display).

```java
@AuraEnabled
public static SaveResult saveCaseAsDraft(Case caseRecord) {
    caseRecord.Status = 'Draft';
    upsert caseRecord;
    Case saved = [SELECT CaseNumber FROM Case WHERE Id = :caseRecord.Id LIMIT 1];
    SaveResult result = new SaveResult();
    result.caseId = caseRecord.Id;
    result.caseNumber = saved.CaseNumber;
    return result;
}
```

**Important:** After a successful save, the returned `caseNumber` is displayed on the UI header under the Case Record Type label (Parts Technical). The `caseId` is stored for subsequent upserts.

### 6.5 Method: `submitCase(Id caseId)` — MP-5 (future, not implemented in this story)

Will be added in MP-5 when Case Information section is wired. Not called from MP-4 code.

---

## 7. LWC Component — `caseCreate`

### 7.1 Component Location

`force-app/main/default/lwc/caseCreate/`

The component already exists as a static UI shell (built from MP-1 mockup). This story wires the Product Information section to live data.

### 7.2 Serial Number Trigger

When the user enters a valid Serial Number and confirms via **Enter** or **Tab**, the component calls `findAssetBySerial` to fetch Asset data. No separate "Search" button click is needed for this flow — the search is triggered on keyboard confirmation.

### 7.3 Key Properties (Product Information)

```javascript
// Asset lookup result
assetId;                    // Id — set when Asset found, used for Case.AssetId
assetFound = false;         // Boolean — controls success message visibility

// Row 1 — read-only after asset lookup
brand = '';
machineType = '';
series = '';
modelNumber = '';

// Row 2 — conditional
unitOfMeasure = '';
machineUsage = '';
usageAvailable = false;     // Controls Machine Usage editability
usedWith = '';              // Always editable

// Row 3
partNumberId;               // Id — Lookup value
partDescription = '';       // Read-only, auto-populated
noPartReason = '';          // Picklist selection

// After save
caseNumber = '';            // Returned from saveCaseAsDraft, shown in header
```

### 7.4 Wire / Imperative Calls (Product Information section)

| Trigger                                  | Apex Method                    | Action on Response                                          |
|-----------------------------------------|-------------------------------|--------------------------------------------------------------|
| Serial Number confirmed (Enter/Tab)      | `findAssetBySerial`           | Populate Row 1 + Row 2 fields, set `assetFound = true`      |
| Clear Search click                       | (none — client-side only)     | Clear all product info fields, set `assetFound = false`      |
| Part Number lookup change                | `getPartDescription`          | Populate `partDescription`, or clear if Part removed         |
| Save button click                        | `saveCaseAsDraft`             | Build Case sObject from **Product Information fields only** (section 4.4), save with Status = Draft, display returned CaseNumber |

### 7.5 UI State Matrix

| State                           | Row 1 fields    | UoM            | Machine Usage  | Engine Serial # | Part Desc          |
|---------------------------------|-----------------|----------------|----------------|-----------------|---------------------|
| No Asset selected               | Empty (disabled)| Empty (disabled)| Editable       | Empty (disabled)| Empty (disabled)    |
| Asset found, Usage available    | Disabled (filled)| Disabled (filled)| Disabled (filled)| Disabled (filled)| Empty (disabled) |
| Asset found, Usage NOT available| Disabled (filled)| Disabled (filled)| Editable       | Disabled (filled)| Empty (disabled) |
| Part Number selected            | (unchanged)     | (unchanged)    | (unchanged)    | (unchanged)     | Disabled (filled)   |

---

## 8. Case Field Assignment on Save

When the user clicks **Save**, the LWC builds a Case sObject with **only Product Information fields** (section 4.4) and calls `saveCaseAsDraft`. No fields from other sections (Case Information, Dealer, etc.) are included — those will be added in their respective stories.

```javascript
const caseRecord = {
    AssetId:                  this.assetId,
    Brand__c:                 this.brand,
    Machine_Type__c:          this.machineType,
    Series__c:                this.series,
    Model_Number__c:          this.modelNumber,
    Unit_of_Measure__c:       this.unitOfMeasure,
    Machine_Usage__c:         this.machineUsage,
    Part_Number__c:           this.partNumberId,
    Part_Description__c:      this.partDescription,
    No_Causal_Part_Reason__c: this.noPartReason,
    Used_With__c:             this.usedWith
};
```

**After save response:**

```javascript
this.caseId = result.caseId;         // Store for subsequent upserts
this.caseNumber = result.caseNumber; // Display in header
// Header now shows: "Case Record Type (Parts Technical)" + CaseNumber
```

---

## 9. Acceptance Criteria Mapping

| # | Acceptance Criteria (from Jira)                                                        | Implementation                                                                                        |
|---|----------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| 1 | Select and create case for "Parts Technical" case type                                  | `caseCreate` LWC scoped to "Parts Technical Help" RecordType                                         |
| 2 | Enter serial number and confirm (Enter/Tab) to fetch asset data                         | `findAssetBySerial` called on Enter/Tab; populates product info fields                                |
| 3 | Brand, Machine Type, Series, Model are pre-populated                                    | `findAssetBySerial` populates Row 1 fields; rendered as disabled text inputs (with borders)           |
| 4 | UoM and Machine Usage auto-populated if usage available                                 | Check `info.usageAvailable`; if true, populate both as disabled text inputs                           |
| 5 | UoM auto-populated, Machine Usage editable if usage not available                       | If `info.usageAvailable == false`, UoM disabled (from Asset), Machine Usage rendered as editable text input |
| 6 | "Used With" optional text field                                                         | `lightning-input` with no `required`; no Asset source                                                 |
| 7 | Part Number and No Part Reason both optional                                            | No `required` attribute on either field                                                               |
| 8 | Part# searches all parts — lookup field                                                 | `lightning-record-picker` querying `Part__c`                                                          |
| 9 | Part Description auto-populated when Part Number available                              | `getPartDescription` called on Part lookup change; result set to `partDescription` as disabled text   |
| 10| All mandatory fields marked                                                             | `required` attribute on Brand, Machine Type, Series, Model Number, Asset/Serial Number                |
| 11| Save as Draft — only Product Information fields                                         | `saveCaseAsDraft` saves only the 11 fields from section 4.4; sets `Status = 'Draft'`                 |
| 12| After save, Case Number returned and shown under Case Record Type (Parts Technical)      | `saveCaseAsDraft` returns `SaveResult`; `caseNumber` displayed in header under record type label      |
| 13| All fields from save mapping stored correctly in Case                                    | See section 4.4 — only Product Information fields, no Case Information fields                         |

---

## 10. Files to Create / Modify

| File                                                          | Action | Purpose                                                  |
|---------------------------------------------------------------|--------|----------------------------------------------------------|
| `force-app/main/default/classes/CaseCreateController.cls`     | Create | Shared Apex controller: `findAssetBySerial`, `getPartDescription`, `saveCaseAsDraft` (MP-4 scope) |
| `force-app/main/default/classes/CaseCreateController.cls-meta.xml` | Create | Apex metadata                                           |
| `force-app/main/default/lwc/caseCreate/caseCreate.html`      | Modify | Wire data bindings, conditional rendering, case number display in header |
| `force-app/main/default/lwc/caseCreate/caseCreate.js`        | Modify | Import Apex methods, add reactive properties, fetch/save logic |
| `force-app/main/default/lwc/caseCreate/caseCreate.css`       | Modify | Success message styling, read-only field styling          |

---

## 11. Dependencies

- `Asset` standard object with standard `AssetId` lookup on Case
- `Asset.Machine_Type__c` formula field (resolves `Product2.Type__c` via `TEXT()`)
- `Asset.Series__c` formula field (resolves `Product2.Series__c`)
- `Model__c` custom object with `Brand_Name__c` lookup to `Brand__c`
- `Brand__c` custom object
- `Part__c` custom object with `Part_Description__c` field
- Case custom fields: `Brand__c`, `Machine_Type__c`, `Series__c`, `Model_Number__c`, `Unit_of_Measure__c`, `Machine_Usage__c`, `Part_Number__c`, `Part_Description__c`, `No_Causal_Part_Reason__c`, `Used_With__c`
- `RecordType` for "Parts Technical Help" must exist on Case
