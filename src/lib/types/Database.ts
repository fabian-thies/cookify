export type DatabaseResponse<T> = DatabaseError | DatabaseSuccess<T>;
type DatabaseError = { success: false; message: string; };
type DatabaseSuccess<T> = { success: true; data: T; };
