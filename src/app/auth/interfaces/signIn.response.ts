export interface SignInResponse {
    user:  User;
    token: string;
}

export interface User {
    _id:      string;
    fullName: string;
    username: string;
    email:    string;
    roles:    string;
    __v:      number;
}