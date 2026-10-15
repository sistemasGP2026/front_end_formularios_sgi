interface FilledBy{
    userId?:string
    fullName:string
    email:string
    document?:string
}
export interface CreateResponse{
    filledBy?:FilledBy 
    sedeCode?:string
    reviewSignatureBase64?: string;
    /** Id del borrador desde el que se completó la respuesta (el backend lo elimina al registrarla). */
    draftId?: string;
    data: Record<string, unknown>
}