declare module "@salesforce/apex/CaseLockController.getCaseData" {
  export default function getCaseData(param: {caseId: any}): Promise<any>;
}
declare module "@salesforce/apex/CaseLockController.getCaseComments" {
  export default function getCaseComments(param: {caseId: any}): Promise<any>;
}
declare module "@salesforce/apex/CaseLockController.getCaseAttachments" {
  export default function getCaseAttachments(param: {caseId: any}): Promise<any>;
}
declare module "@salesforce/apex/CaseLockController.submitFeedback" {
  export default function submitFeedback(param: {caseId: any, feedbackText: any}): Promise<any>;
}
