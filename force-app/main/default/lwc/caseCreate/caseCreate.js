import { LightningElement } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import findAssetBySerial from '@salesforce/apex/CaseCreateController.findAssetBySerial';
import getPartDescription from '@salesforce/apex/CaseCreateController.getPartDescription';
import saveCaseAsDraft from '@salesforce/apex/CaseCreateController.saveCaseAsDraft';

export default class CaseCreate extends LightningElement {
    /* ========== Section toggle state ========== */
    assetOpen = true;
    productOpen = true;

    /* ========== Asset / Serial Number ========== */
    serialNumber = '';
    assetNotApplicable = false;
    assetId;
    assetFound = false;
    isSearching = false;

    /* ========== Product Info: Row 1 (disabled text inputs) ========== */
    brand = '';
    machineType = '';
    series = '';
    modelNumber = '';

    /* ========== Product Info: Row 2 (conditional) ========== */
    unitOfMeasure = '';
    machineUsage = '';
    usageAvailable = false;
    usedWith = '';
    engineSerial = '';

    /* ========== Product Info: Row 3 ========== */
    partNumberId;
    partDescription = '';
    noPartReason = '';

    /* ========== After save ========== */
    caseId;
    caseNumber = '';
    isSaving = false;

    /* ========== Computed properties ========== */
    get isMachineUsageDisabled() {
        return this.usageAvailable;
    }

    get showCaseNumber() {
        return !!this.caseNumber;
    }

    /* ========== Chevron icons ========== */
    get assetChevron() {
        return this.assetOpen ? 'utility:chevrondown' : 'utility:chevronright';
    }
    get productChevron() {
        return this.productOpen ? 'utility:chevrondown' : 'utility:chevronright';
    }

    /* ========== Picklist options (Product Info only) ========== */
    get noPartReasonOptions() {
        return [
            { label: 'No Fault Found', value: 'No Fault Found' },
            { label: 'Legacy Part', value: 'Legacy Part' },
            { label: 'Missing Part', value: 'Missing Part' }
        ];
    }

    /* ========== Section toggle ========== */
    toggleSection(event) {
        const section = event.currentTarget.dataset.section;
        this[section + 'Open'] = !this[section + 'Open'];
    }

    /* ========== Asset / Serial Number handlers ========== */
    handleAssetToggle(event) {
        this.assetNotApplicable = event.target.checked;
    }

    handleSerialNumberKeyUp(event) {
        const newVal = event.target.value;
        if (newVal !== this.serialNumber && this.assetFound) {
            this.clearProductInfo();
        }
        this.serialNumber = newVal;
        if (event.key === 'Enter') {
            this.searchAsset();
        }
    }

    handleSerialNumberChange(event) {
        this.serialNumber = event.target.value;
        if (this.serialNumber && !this.assetFound && !this.isSearching) {
            this.searchAsset();
        }
    }

    handleClearSearch() {
        this.serialNumber = '';
        this.clearProductInfo();
    }

    async searchAsset() {
        if (!this.serialNumber || this.isSearching) {
            return;
        }
        this.isSearching = true;
        try {
            const result = await findAssetBySerial({ serialNumber: this.serialNumber });
            if (result) {
                this.assetId = result.assetId;
                this.brand = result.brand || '';
                this.machineType = result.machineType || '';
                this.series = result.series || '';
                this.modelNumber = result.modelNumber || '';
                this.unitOfMeasure = result.unitOfMeasure || '';
                this.machineUsage = result.machineUsage || '';
                this.usageAvailable = result.usageAvailable;
                this.engineSerial = result.engineSerial || '';
                this.assetFound = true;
            } else {
                this.clearProductInfo();
                this.showToast('Warning', 'No asset found for serial number: ' + this.serialNumber, 'warning');
            }
        } catch (error) {
            this.clearProductInfo();
            this.showToast('Error', error.body?.message || 'Error searching for asset', 'error');
        } finally {
            this.isSearching = false;
        }
    }

    clearProductInfo() {
        this.assetId = undefined;
        this.assetFound = false;
        this.brand = '';
        this.machineType = '';
        this.series = '';
        this.modelNumber = '';
        this.unitOfMeasure = '';
        this.machineUsage = '';
        this.usageAvailable = false;
        this.engineSerial = '';
    }

    /* ========== Product Info handlers ========== */
    handleMachineUsageChange(event) {
        this.machineUsage = event.target.value;
    }

    handleUsedWithChange(event) {
        this.usedWith = event.target.value;
    }

    handlePartNumberChange(event) {
        this.partNumberId = event.detail.recordId;
        if (this.partNumberId) {
            this.fetchPartDescription();
        } else {
            this.partDescription = '';
        }
    }

    async fetchPartDescription() {
        try {
            const desc = await getPartDescription({ partId: this.partNumberId });
            this.partDescription = desc || '';
        } catch (error) {
            this.partDescription = '';
            this.showToast('Error', 'Error fetching part description', 'error');
        }
    }

    handleNoPartReasonChange(event) {
        this.noPartReason = event.detail.value;
    }

    /* ========== Save handler (Product Information only) ========== */
    async handleSave() {
        this.isSaving = true;
        try {
            const caseRecord = {
                AssetId:                  this.assetId || null,
                Brand__c:                 this.brand || null,
                Machine_Type__c:          this.machineType || null,
                Series__c:                this.series || null,
                Model_Number__c:          this.modelNumber || null,
                Unit_of_Measure__c:       this.unitOfMeasure || null,
                Machine_Usage__c:         this.machineUsage || null,
                Part_Number__c:           this.partNumberId || null,
                Part_Description__c:      this.partDescription || null,
                No_Causal_Part_Reason__c: this.noPartReason || null,
                Used_With__c:             this.usedWith || null
            };

            if (this.caseId) {
                caseRecord.Id = this.caseId;
            }

            const result = await saveCaseAsDraft({ caseRecord });
            this.caseId = result.caseId;
            this.caseNumber = result.caseNumber;
            this.showToast('Success', 'Case ' + this.caseNumber + ' saved as Draft', 'success');
        } catch (error) {
            this.showToast('Error', error.body?.message || 'Error saving case', 'error');
        } finally {
            this.isSaving = false;
        }
    }

    /* ========== Utility ========== */
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
