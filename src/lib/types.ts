export type IngredientInput = {
    id?: number;
    name: string;
    quantity: string;
    recipeId?: number;
};

export enum NavActionType {
    CANCEL = 'Cancel',
    PUBLISH = 'Publish'
}

export type NavAction = {
    type: NavActionType;
    formId: string;
    formaction: string;
}