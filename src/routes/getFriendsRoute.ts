import {Request, Response} from "express";
import {JSONResponse, User} from "../../env/types";
import jwt from "jsonwebtoken";

export function handleGetFriends(this: any, req: Request, res: Response) {
    let jwtToken: string | undefined = req.headers['authorization'];

    if (!jwtToken) {
        const response: JSONResponse = {status: "ERROR"};
        res.json(response);
        return;
    }

    let db: User[] = this.loadDataFromJSONFile(this.userDBPath);

    jwt.verify(jwtToken, this.secretKey, (err: any, decoded: any) => {
        if (!err) {
            let user: User | undefined = db.find((item: User) => item.email.toUpperCase() === decoded.email.toUpperCase());
            if (!user) return;
            let friends = user.friends.map(email => {
                let friend = db.find(u => u.email === email);
                if (!friend) return
                return {
                    email: friend.email,
                    name: friend.name,
                    photo: friend.photo,
                    lastActivity: friend.lastActivity
                };
            });
            if (user) {
                const response: JSONResponse = {status: "OK", requests: friends as any};
                res.json(response);
            } else {
                const response: JSONResponse = {status: "ERROR"};
                res.json(response);
            }

            return;
        } else {
            const response: JSONResponse = {status: "ERROR"};
            res.json(response);
            return;
        }
    });
}