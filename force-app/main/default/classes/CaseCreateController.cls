public with sharing class CaseCreateController {

    public class AssetWrapper {
        @AuraEnabled public Id assetId;
        @AuraEnabled public String brand;
        @AuraEnabled public String machineType;
        @AuraEnabled public String series;
        @AuraEnabled public String modelNumber;
        @AuraEnabled public String unitOfMeasure;
        @AuraEnabled public String machineUsage;
        @AuraEnabled public Boolean usageAvailable;
        @AuraEnabled public String engineSerial;
    }

    public class SaveResult {
        @AuraEnabled public Id caseId;
        @AuraEnabled public String caseNumber;
    }

    @AuraEnabled
    public static AssetWrapper findAssetBySerial(String serialNumber) {
        List<Asset> assets = [
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
        ];

        if (assets.isEmpty()) {
            return null;
        }

        Asset a = assets[0];
        AssetWrapper info = new AssetWrapper();
        info.assetId        = a.Id;
        info.brand          = a.Model_Name__r?.Brand_Name__r?.Name;
        info.machineType    = a.Machine_Type__c;
        info.series         = a.Series__c;
        info.modelNumber    = a.Model_Name__r?.Name;
        info.unitOfMeasure  = a.Unit_of_Measure__c;
        info.machineUsage   = a.Usage__c != null
                              ? String.valueOf(a.Usage__c.intValue()) : null;
        info.usageAvailable = a.Usage__c != null;
        info.engineSerial   = a.Engine_Serial_Number__c;
        return info;
    }

    @AuraEnabled
    public static String getPartDescription(Id partId) {
        List<Part__c> parts = [
            SELECT Id, Part_Description__c
            FROM Part__c
            WHERE Id = :partId
            LIMIT 1
        ];
        return parts.isEmpty() ? null : parts[0].Part_Description__c;
    }

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
}
