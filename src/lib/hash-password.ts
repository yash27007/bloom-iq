import {hash} from "bcryptjs"

export const hashPassword = async(password:string): Promise<string> =>{
    return await hash(password,12);
}