export interface UserResponse{
    id: string,
    fullName: string;
    username: string;
    email: string;
    rol: string;
    createdAt: Date;
    updatedAt?: Date;
    active: boolean;
}