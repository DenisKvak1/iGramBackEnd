import {Request, Response} from "express";
import {JSONResponse, LoginValue, User} from "../../env/types";
import jwt from "jsonwebtoken";
import {options} from "../../env/types";

export function handleRegister(this: any, req: Request, res: Response): void {
    const {credentials, options}: { credentials: LoginValue; options: options } = req.body;

if (!credentials || !options) {
    const response: JSONResponse = {status: "ERROR", Error: "Не переданы нужные параметры"};
    res.json(response);
    return;
}

const emailRegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegExp = /^[a-zA-Z0-9!@#$%^&*()_+{}\[\]:;<>,.?~\\-]+$/;
const nameRegExp = /^[a-zA-Zа-яА-Я]+(?:-[a-zA-Zа-яА-Я]+)*$/;

if (
    !credentials.email ||
    !credentials.password ||
    !options.name ||
    !emailRegExp.test(credentials.email) ||
    !passwordRegExp.test(credentials.password) ||
    !nameRegExp.test(options.name)
) {
    const response: JSONResponse = {status: "ERROR", Error: "Параметры имеют неверный формат"};
    res.json(response);
    return;
}

let db: User[] = this.loadDataFromJSONFile(this.userDBPath);

if (db.some((item: User) => credentials.email.toUpperCase() === item.email.toUpperCase())) {
    const response: JSONResponse = {status: "ERROR", Error: "Аккаунт уже создан"};
    res.json(response);
    return;
}

db.push({
    email: credentials.email,
    name: options.name,
    password: credentials.password,
    friendsRequest: [],
    friendsOutRequest: [],
    friends: [],
    photo: "http://127.0.0.1:3000/img/standartAvatar.png",
});

this.saveDataToJSONFile(db, this.userDBPath);

const token: string = jwt.sign({email: credentials.email}, this.secretKey, {expiresIn: '10d'});

const response: JSONResponse = {status: "OK", jwt: token, email: credentials.email};
res.json(response);
}