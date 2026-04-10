import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { NavigationMixin } from 'lightning/navigation';
import getAccountSummaryData from '@salesforce/apex/AccountSummaryController.getAccountSummaryData';

import NAME_FIELD from '@salesforce/schema/Account.Name';
import TYPE_FIELD from '@salesforce/schema/Account.Type';
import INDUSTRY_FIELD from '@salesforce/schema/Account.Industry';
import PHONE_FIELD from '@salesforce/schema/Account.Phone';
import OWNER_NAME_FIELD from '@salesforce/schema/Account.Owner.Name';

const FIELDS = [NAME_FIELD, TYPE_FIELD, INDUSTRY_FIELD, PHONE_FIELD, OWNER_NAME_FIELD];

export default class AccountSummary extends NavigationMixin(LightningElement) {
    @api recordId;

    openOpportunities = [];
    openCases = [];
    openOpportunityCount = 0;
    openCaseCount = 0;
    isLoadingCounts = true;

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    account;

    @wire(getAccountSummaryData, { accountId: '$recordId' })
    wiredSummaryData({ error, data }) {
        if (data) {
            this.openOpportunities = data.openOpportunities || [];
            this.openCases = data.openCases || [];
            this.openOpportunityCount = data.openOpportunityCount;
            this.openCaseCount = data.openCaseCount;
            this.isLoadingCounts = false;
        } else if (error) {
            this.isLoadingCounts = false;
        }
    }

    get name() {
        return getFieldValue(this.account.data, NAME_FIELD);
    }

    get type() {
        return getFieldValue(this.account.data, TYPE_FIELD);
    }

    get industry() {
        return getFieldValue(this.account.data, INDUSTRY_FIELD);
    }

    get phone() {
        return getFieldValue(this.account.data, PHONE_FIELD);
    }

    get ownerName() {
        return getFieldValue(this.account.data, OWNER_NAME_FIELD);
    }

    get isLoading() {
        return (!this.account.data && !this.account.error) || this.isLoadingCounts;
    }

    get hasData() {
        return !!this.account.data && !this.account.error;
    }

    get hasOpportunities() {
        return this.openOpportunities.length > 0;
    }

    get hasCases() {
        return this.openCases.length > 0;
    }

    handleRecordNavigation(event) {
        const recordId = event.currentTarget.dataset.recordId;
        const objectApiName = event.currentTarget.dataset.objectType;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId,
                objectApiName,
                actionName: 'view'
            }
        });
    }
}
