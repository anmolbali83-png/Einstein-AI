public with sharing class AccountSummaryController {

    @AuraEnabled(cacheable=true)
    public static AccountSummaryData getAccountSummaryData(Id accountId) {
        AccountSummaryData result = new AccountSummaryData();

        result.openOpportunities = [
            SELECT Id, Name, StageName, CloseDate, Amount
            FROM Opportunity
            WHERE AccountId = :accountId AND IsClosed = false
            WITH USER_MODE
            ORDER BY CloseDate ASC
            LIMIT 5
        ];

        result.openCases = [
            SELECT Id, CaseNumber, Subject, Status, Priority
            FROM Case
            WHERE AccountId = :accountId AND IsClosed = false
            WITH USER_MODE
            ORDER BY CreatedDate DESC
            LIMIT 5
        ];

        result.openOpportunityCount = [
            SELECT COUNT() FROM Opportunity WHERE AccountId = :accountId AND IsClosed = false
        ];

        result.openCaseCount = [
            SELECT COUNT() FROM Case WHERE AccountId = :accountId AND IsClosed = false
        ];

        return result;
    }

    public class AccountSummaryData {
        @AuraEnabled public List<Opportunity> openOpportunities;
        @AuraEnabled public List<Case> openCases;
        @AuraEnabled public Integer openOpportunityCount;
        @AuraEnabled public Integer openCaseCount;
    }
}
