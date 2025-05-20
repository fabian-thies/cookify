export enum NavActionType {
    CANCEL = 'Cancel',
    PUBLISH = 'Publish'
}

export type NavAction = {
    type: NavActionType;
    formId: string;
    formaction: string;
}