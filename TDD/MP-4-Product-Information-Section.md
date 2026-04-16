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

When a user creates a "Parts Technical Help" support case and provides an Asset/Serial Number, the **Product Information** section auto-populates equipment and product fields from the related Asset record. Some fields are read-only (derived from Asset), some are conditionally editable, and some are fully manual. This document covers the field mapping, data retrieval logic, and UI behavior for the Product Information section only.

---

## 2. UI Layout (from Mockup)

Four-column grid, three rows inside a collapsible "Product Information" section.

```
Row 1:  BRAND *           | MACHINE TYPE *     | SERIES *        | MODEL NUMBER *
        (read-only)       | (read-only)        | (read-only)     | (read-only)

Row 2:  UNIT OF MEASURE   | MACHINE USAGE      | USED WITH       | ENGINE SERIAL #
        (read-only)       | (conditional edit)  | (editable)      | (editable)

Row 3:  PART NUMBER       | PART DESCRIPTION   | NO PART REASON  |
        (lookup search)   | (auto-populated)    | (picklist)      |
```

**Footer buttons:** Save (primary/red), Submit, Resolve, Cancel

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
 |     |-- Asset.Product2Id (standard Lookup --> Product2)
 |     |     |-- Product2.Type__c (Picklist) ..... --> Case.Machine_Type__c
 |     |     |-- Product2.Series__c (Text) ....... --> Case.Series__c
 |     |
 |     |-- Asset.Unit_of_Measure__c (Picklist) ... --> Case.Unit_of_Measure__c
 |     |-- Asset.Usage__c (Number 18,0) .......... --> Case.Machine_Usage__c
 |     |-- Asset.Engine_Serial_Number__c (Text 80) -> Case.Engine_Serial_Number__c
 |
 |-- Part_Number__c (Lookup --> Part__c)
       |-- Part__c.Name (Text, labeled "Part Number")
       |-- Part__c.Part_Description__c (Text 255) -> Case.Part_Description__c
```

---

## 4. Field Mapping — Asset to Case

### 4.1 Auto-populated from Asset (on Asset/Serial Number search)

| #  | Case Field API Name          | Case Field Type | Source Object | Source Field API Name       | Source Field Type   | Traversal Path from Asset              |
|----|------------------------------|-----------------|---------------|-----------------------------|---------------------|----------------------------------------|
| 1  | `Brand__c`                   | Text(255)       | Brand__c      | `Name`                      | Text (Name field)   | `Asset.Model_Name__r.Brand_Name__r.Name` |
| 2  | `Machine_Type__c`            | Text(255)       | Product2      | `Type__c`                   | Picklist            | `Asset.Product2.Type__c` (use TEXT())  |
| 3  | `Series__c`                  | Text(255)       | Product2      | `Series__c`                 | Text                | `Asset.Product2.Series__c`             |
| 4  | `Model_Number__c`            | Text(255)       | Model__c      | `Name`                      | Text (Name field)   | `Asset.Model_Name__r.Name`             |
| 5  | `Unit_of_Measure__c`         | Text(255)       | Asset         | `Unit_of_Measure__c`        | Picklist            | `Asset.Unit_of_Measure__c` (use TEXT())|
| 6  | `Machine_Usage__c`           | Text(255)       | Asset         | `Usage__c`                  | Number(18,0)        | `Asset.Usage__c` (convert to String)   |
| 7  | `Engine_Serial_Number__c`    | Text(255)       | Asset         | `Engine_Serial_Number__c`   | Text(80)            | `Asset.Engine_Serial_Number__c`        |

### 4.2 Auto-populated from Part (on Part Number selection)

| #  | Case Field API Name          | Case Field Type | Source Object | Source Field API Name       | Source Field Type |
|----|------------------------------|-----------------|---------------|-----------------------------|-------------------|
| 8  | `Part_Description__c`        | Text(255)       | Part__c       | `Part_Description__c`       | Text(255)         |

### 4.3 Manual entry (no auto-population)

| #  | Case Field API Name          | Case Field Type          | Notes                                      |
|----|------------------------------|--------------------------|--------------------------------------------|
| 9  | `Used_With__c`               | Text(50)                 | Optional, free-text entry                  |
| 10 | `Part_Number__c`             | Lookup(Part__c)          | Optional, search across all Part__c records |
| 11 | `No_Causal_Part_Reason__c`   | Picklist                 | Values: No Fault Found, Legacy Part, Missing Part |

---

## 5. Field Behavior Rules

### 5.1 Row 1 — Equipment Identity (all required, all read-only after Asset lookup)

| Field          | Required | Editable | Behavior                                                        |
|----------------|----------|----------|-----------------------------------------------------------------|
| Brand          | Yes (*)  | No       | Read-only. Populated when Asset is found. Cleared on Clear Search. |
| Machine Type   | Yes (*)  | No       | Read-only. Populated when Asset is found. Cleared on Clear Search. |
| Series         | Yes (*)  | No       | Read-only. Populated when Asset is found. Cleared on Clear Search. |
| Model Number   | Yes (*)  | No       | Read-only. Populated when Asset is found. Cleared on Clear Search. |

### 5.2 Row 2 — Usage and Serial Info

| Field            | Required | Editable | Behavior                                                                          |
|------------------|----------|----------|-----------------------------------------------------------------------------------|
| Unit of Measure  | No       | No       | Read-only. Auto-populated from Asset.Unit_of_Measure__c if available.             |
| Machine Usage    | No       | Conditional | Auto-populated AND read-only if Asset.Usage__c has a value. Editable (text input) if Asset.Usage__c is null/blank. |
| Used With        | No       | Yes      | Always editable. Free-text entry. Not sourced from Asset.                         |
| Engine Serial #  | No       | Yes      | Pre-populated from Asset.Engine_Serial_Number__c if available. Always editable regardless (user can override). |

### 5.3 Row 3 — Part Information

| Field            | Required | Editable | Behavior                                                                          |
|------------------|----------|----------|-----------------------------------------------------------------------------------|
| Part Number      | No       | Yes      | Lookup to Part__c with search. Retained even if Part not found in system.         |
| Part Description | No       | No       | Read-only. Auto-populated from Part__c.Part_Description__c when Part Number is selected. Blank if no Part selected. |
| No Part Reason   | No       | Yes      | Picklist selection. Independent of other fields.                                  |

---

## 6. Apex Controller — Data Retrieval

### 6.1 Method: `getProductInfoFromAsset(Id assetId)`

Called when a valid Asset/Serial Number is found. Returns a wrapper with all product information fields.

**SOQL query:**

```sql
SELECT Id, Name, SerialNumber,
       Model_Name__c,
       Model_Name__r.Name,
       Model_Name__r.Brand_Name__c,
       Model_Name__r.Brand_Name__r.Name,
       Product2Id,
       Product2.Type__c,
       Product2.Series__c,
       Unit_of_Measure__c,
       Usage__c,
       Engine_Serial_Number__c
FROM Asset
WHERE Id = :assetId
   OR SerialNumber = :serialNumber
   OR Name = :serialNumber
LIMIT 1
```

**Return wrapper structure:**

```java
public class ProductInfoWrapper {
    @AuraEnabled public String brand;              // Model_Name__r.Brand_Name__r.Name
    @AuraEnabled public String machineType;        // TEXT(Product2.Type__c)
    @AuraEnabled public String series;             // Product2.Series__c
    @AuraEnabled public String modelNumber;        // Model_Name__r.Name
    @AuraEnabled public String unitOfMeasure;      // TEXT(Unit_of_Measure__c)
    @AuraEnabled public String machineUsage;       // String.valueOf(Usage__c) or null
    @AuraEnabled public Boolean usageAvailable;    // Usage__c != null
    @AuraEnabled public String engineSerial;       // Engine_Serial_Number__c
    @AuraEnabled public Id assetId;                // Id for Case.AssetId assignment
}
```

**Mapping logic in Apex:**

```java
ProductInfoWrapper info = new ProductInfoWrapper();
info.brand         = asset.Model_Name__r?.Brand_Name__r?.Name;
info.machineType   = asset.Product2?.Type__c != null
                     ? String.valueOf(asset.Product2.Type__c) : null;
info.series        = asset.Product2?.Series__c;
info.modelNumber   = asset.Model_Name__r?.Name;
info.unitOfMeasure = asset.Unit_of_Measure__c != null
                     ? String.valueOf(asset.Unit_of_Measure__c) : null;
info.machineUsage  = asset.Usage__c != null
                     ? String.valueOf(asset.Usage__c.intValue()) : null;
info.usageAvailable = asset.Usage__c != null;
info.engineSerial  = asset.Engine_Serial_Number__c;
info.assetId       = asset.Id;
```

### 6.2 Method: `getPartDescription(Id partId)`

Called when Part Number lookup value changes. Returns Part Description.

```sql
SELECT Id, Part_Description__c
FROM Part__c
WHERE Id = :partId
LIMIT 1
```

### 6.3 Method: `saveCaseAsDraft(Case caseRecord)`

Persists the Case with Status = 'Draft'. All Product Information fields are saved to the corresponding Case fields listed in section 4.

---

## 7. LWC Component — `caseCreate`

### 7.1 Component Location

`force-app/main/default/lwc/caseCreate/`

The component already exists as a static UI shell (built from MP-1 mockup). This story wires the Product Information section to live data.

### 7.2 Key Properties

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
engineSerial = '';          // Editable, pre-populated if available

// Row 3
partNumberId;               // Id — Lookup value
partDescription = '';       // Read-only, auto-populated
noPartReason = '';          // Picklist selection
```

### 7.3 Wire / Imperative Calls

| Trigger                        | Apex Method                    | Action on Response                                          |
|-------------------------------|-------------------------------|--------------------------------------------------------------|
| Asset search button click      | `getProductInfoFromAsset`     | Populate Row 1 + Row 2 fields, set `assetFound = true`      |
| Clear Search click             | (none — client-side only)     | Clear all product info fields, set `assetFound = false`      |
| Part Number lookup change      | `getPartDescription`          | Populate `partDescription`, or clear if Part removed         |
| Save button click              | `saveCaseAsDraft`             | Build Case sObject from all fields, save with Status = Draft |

### 7.4 UI State Matrix

| State                           | Row 1 fields | UoM     | Machine Usage | Engine Serial | Part Desc |
|---------------------------------|-------------|---------|---------------|---------------|-----------|
| No Asset selected               | Empty       | Empty   | Editable      | Editable      | Empty     |
| Asset found, Usage available    | Read-only   | Read-only| Read-only    | Editable (pre-filled) | Empty |
| Asset found, Usage NOT available| Read-only   | Read-only| Editable     | Editable (pre-filled) | Empty |
| Part Number selected            | (unchanged) | (unchanged)| (unchanged)| (unchanged)   | Read-only (filled) |

---

## 8. Case Field Assignment on Save

When the user clicks **Save**, build the Case sObject:

```javascript
const caseRecord = {
    RecordTypeId:             '<Parts Technical Help RecordType Id>',
    AssetId:                  this.assetId,
    Status:                   'Draft',
    Brand__c:                 this.brand,
    Machine_Type__c:          this.machineType,
    Series__c:                this.series,
    Model_Number__c:          this.modelNumber,
    Unit_of_Measure__c:       this.unitOfMeasure,
    Machine_Usage__c:         this.machineUsage,
    Used_With__c:             this.usedWith,
    Engine_Serial_Number__c:  this.engineSerial,
    Part_Number__c:           this.partNumberId,
    Part_Description__c:      this.partDescription,
    No_Causal_Part_Reason__c: this.noPartReason
};
```

---

## 9. Acceptance Criteria Mapping

| # | Acceptance Criteria (from Jira)                                                        | Implementation                                                                                        |
|---|----------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| 1 | Select and create case for "Parts Technical" case type                                  | `caseCreate` LWC scoped to "Parts Technical Help" RecordType                                         |
| 2 | Provide asset number on the case — mandatory                                            | Asset/Serial Number field with `required` attribute; Save blocked until provided                       |
| 3 | Brand, Machine Type, Series, Model are pre-populated                                    | `getProductInfoFromAsset` populates Row 1 fields; rendered as `read-only` inputs                     |
| 4 | UoM and Machine Usage auto-populated if latest usage available                          | Check `info.usageAvailable`; if true, populate both as read-only                                      |
| 5 | UoM auto-populated, Machine Usage editable if usage not available                       | If `info.usageAvailable == false`, UoM read-only (from Asset), Machine Usage rendered as editable    |
| 6 | "Used With" optional text field                                                         | `lightning-input` with no `required`; no Asset source                                                 |
| 7 | Engine Serial# optional, pre-populated if available                                     | Populated from `info.engineSerial`; always editable (`lightning-input`, no `disabled`)                |
| 8 | Engine Serial# editable as text                                                         | Standard `lightning-input type="text"`                                                                |
| 9 | Part Number and No Part Reason both optional                                            | No `required` attribute on either field                                                               |
| 10| Part# searches all parts — lookup field                                                 | `lightning-record-picker` or custom lookup component querying `Part__c`                               |
| 11| Part Description auto-populated when Part Number available                              | `getPartDescription` called on Part lookup change; result set to `partDescription` as read-only       |
| 12| Part Number retained if not found in system                                             | Use text-based search with fallback; don't clear user input on no-match                               |
| 13| All mandatory fields marked                                                             | `required` attribute on Brand, Machine Type, Series, Model Number, Asset/Serial Number                |
| 14| Save as Draft                                                                           | `saveCaseAsDraft` sets `Status = 'Draft'` before insert                                               |

---

## 10. Files to Create / Modify

| File                                                          | Action | Purpose                                      |
|---------------------------------------------------------------|--------|----------------------------------------------|
| `force-app/main/default/classes/CaseCreateController.cls`     | Create | Apex controller: asset lookup, part lookup, save |
| `force-app/main/default/classes/CaseCreateController.cls-meta.xml` | Create | Apex metadata                               |
| `force-app/main/default/lwc/caseCreate/caseCreate.html`      | Modify | Wire data bindings, conditional rendering     |
| `force-app/main/default/lwc/caseCreate/caseCreate.js`        | Modify | Import Apex methods, add reactive properties  |
| `force-app/main/default/lwc/caseCreate/caseCreate.css`       | Modify | Success message styling, read-only field styling |

---

## 11. Dependencies

- `Asset` standard object with standard `AssetId` lookup on Case
- `Model__c` custom object with `Brand_Name__c` lookup to `Brand__c`
- `Brand__c` custom object
- `Product2` standard object with `Type__c` (Picklist) and `Series__c` (Text) custom fields
- `Part__c` custom object with `Part_Description__c` field
- All Case custom fields from section 4 must be deployed (already done)
