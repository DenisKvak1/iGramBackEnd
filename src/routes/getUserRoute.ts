import {Request, Response} from "express";
import {UserDB} from "../../env/types";
import jwt from "jsonwebtoken";

export function handleGetUser(this: any, req: Request, res: Response) {
    let jwtToken = req.headers['authorization']
    const login = req.query.login as string;

    if (!jwtToken) {
        res.json({"status": "ERROR"})
        return
    }
    let db: UserDB = this.loadDataFromJSONFile(this.userDBPath)
    jwt.verify(jwtToken, this.secretKey, (err: any, decoded: any) => {
        if (!err) {
            let searchUser = db.find((item) => item.email.toUpperCase() === login.toUpperCase())

            if (searchUser) {
                res.json({
                    "status": "OK", user: {
                        email: searchUser.email,
                        name: searchUser.name,
                        photo: searchUser.photo
                    }
                })
            }
        } else {
            res.json({"status": "ERROR"})
        }
    })
}