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
    data: Record<string, unknown>
}