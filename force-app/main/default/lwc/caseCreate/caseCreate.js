import { LightningElement } from 'lwc';

export default class CaseCreate extends LightningElement {
    /* ---------- section toggle state ---------- */
    assetOpen = true;
    productOpen = true;
    caseInfoOpen = true;
    commentsOpen = true;
    dealerOpen = true;
    attachmentsOpen = true;
    resolveOpen = true;

    /* ---------- field state ---------- */
    assetNotApplicable = false;
    requestCallback = true;

    /* ---------- static attachment list ---------- */
    dummyFiles = [
        { id: '1', name: 'Filename.png' },
        { id: '2', name: 'Filename.png' },
        { id: '3', name: 'Filename.png' },
        { id: '4', name: 'Filename.png' },
        { id: '5', name: 'Filename.png' }
    ];

    get fileCount() {
        return this.dummyFiles.length;
    }

    /* ---------- chevron icons ---------- */
    get assetChevron() {
        return this.assetOpen ? 'utility:chevrondown' : 'utility:chevronright';
    }
    get productChevron() {
        return this.productOpen ? 'utility:chevrondown' : 'utility:chevronright';
    }
    get caseInfoChevron() {
        return this.caseInfoOpen ? 'utility:chevrondown' : 'utility:chevronright';
    }
    get commentsChevron() {
        return this.commentsOpen ? 'utility:chevrondown' : 'utility:chevronright';
    }
    get dealerChevron() {
        return this.dealerOpen ? 'utility:chevrondown' : 'utility:chevronright';
    }
    get attachmentsChevron() {
        return this.attachmentsOpen ? 'utility:chevrondown' : 'utility:chevronright';
    }
    get resolveChevron() {
        return this.resolveOpen ? 'utility:chevrondown' : 'utility:chevronright';
    }

    /* ---------- handlers ---------- */
    toggleSection(event) {
        const section = event.currentTarget.dataset.section;
        const prop = section + 'Open';
        this[prop] = !this[prop];
    }

    handleAssetToggle(event) {
        this.assetNotApplicable = event.target.checked;
    }

    /* ---------- combobox options ---------- */
    get brandOptions() {
        return [
            { label: 'AGCO', value: 'agco' },
            { label: 'Fendt', value: 'fendt' },
            { label: 'Massey Ferguson', value: 'mf' },
            { label: 'Valtra', value: 'valtra' }
        ];
    }

    get machineTypeOptions() {
        return [
            { label: 'Tractor', value: 'tractor' },
            { label: 'Combine', value: 'combine' },
            { label: 'Sprayer', value: 'sprayer' }
        ];
    }

    get unitOptions() {
        return [
            { label: 'Hours', value: 'hours' },
            { label: 'Miles', value: 'miles' },
            { label: 'Kilometers', value: 'km' }
        ];
    }

    get usageOptions() {
        return [
            { label: '0-500', value: '0-500' },
            { label: '500-1000', value: '500-1000' },
            { label: '1000+', value: '1000+' }
        ];
    }

    get engineSerialOptions() {
        return [{ label: 'N/A', value: 'na' }];
    }

    get noPartReasonOptions() {
        return [
            { label: 'No Fault Found', value: 'noFaultFound' },
            { label: 'Legacy Part', value: 'legacyPart' },
            { label: 'Missing Part', value: 'missingPart' }
        ];
    }

    get mainAreaOptions() {
        return [
            { label: 'Engine', value: 'engine' },
            { label: 'Transmission', value: 'transmission' },
            { label: 'Electrical', value: 'electrical' },
            { label: 'Hydraulics', value: 'hydraulics' }
        ];
    }

    get subAreaOptions() {
        return [
            { label: 'Sub Area 1', value: 'sub1' },
            { label: 'Sub Area 2', value: 'sub2' }
        ];
    }

    get priorityOptions() {
        return [
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' },
            { label: 'Critical', value: 'critical' }
        ];
    }

    get severityOptions() {
        return [
            { label: '1 - Critical', value: '1' },
            { label: '2 - High', value: '2' },
            { label: '3 - Medium', value: '3' },
            { label: '4 - Low', value: '4' }
        ];
    }
}
