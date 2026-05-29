import { User } from "./signIn.response";

export interface CheckTokenResponse {
  user:  User;
  token: string;
}