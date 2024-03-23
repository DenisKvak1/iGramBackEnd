import {Request, Response} from "express";
import {JSONResponse, User} from "../../env/types";
import jwt from "jsonwebtoken";

export function handleLogin(this: any, req: Request, res: Response): void {
    const {email, password}: { email: string; password: string } = req.body;

    if (!email || !password) {
        const response: JSONResponse = {status: "ERROR", Error: "Не указан логин или пароль"};
        res.json(response);
        return;
    }

    let db: User[] = this.loadDataFromJSONFile(this.userDBPath);
    let user: User | undefined = db.find((item: User) => item.email.toUpperCase() === email.toUpperCase());

    if (!user) {
        const response: JSONResponse = {status: "ERROR", Error: "Пользователь не найден"};
        res.json(response);
        return;
    }

    if (user.password !== password) {
        const response: JSONResponse = {status: "ERROR", Error: "Пароль не верный"};
        res.json(response);
        return;
    }

    const token: string = jwt.sign({email: email}, this.secretKey, {expiresIn: '10d'});

    const response: JSONResponse = {status: "OK", jwt: token, email: email};
    res.json(response);
}