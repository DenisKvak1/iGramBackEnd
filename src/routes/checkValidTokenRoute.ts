import {Request, Response} from "express";
import {JSONResponse} from "../../env/types";
import jwt from "jsonwebtoken";

export function handleCheckValidToken(this: any, req: Request, res: Response) {
    let jwtToken: string | undefined = req.headers['authorization'];

    if (!jwtToken) {
        const response: JSONResponse = {status: "ERROR"};
        res.json(response);
        return;
    }

    jwt.verify(jwtToken, this.secretKey, (err: any, decoded: any) => {
        if (!err) {
            const response: JSONResponse = {status: "OK"};
            res.json(response);
        } else {
            const response: JSONResponse = {status: "ERROR"};
            res.json(response);
        }
    });
}
