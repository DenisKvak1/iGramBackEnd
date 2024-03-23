import {Request, Response} from "express";
import {Chat, ChatDB, JSONResponse, User, UserDB} from "../../env/types";
import jwt from "jsonwebtoken";

export function handleGetChats(this: any, req: Request, res: Response) {
    const idParam: string | undefined = req.query.id as string;
    let jwtToken: string | undefined = req.headers['authorization'];

    if (!jwtToken) {
        const response: JSONResponse = {status: "ERROR"};
        res.json(response);
        return;
    }

    jwt.verify(jwtToken, this.secretKey, (err: any, decoded: any) => {
        if (!err) {
            let chatDB: ChatDB = this.loadDataFromJSONFile(this.chatDBPath);
            let userDB: UserDB = this.loadDataFromJSONFile(this.userDBPath);
            let chats: ChatDB = chatDB.filter((item: ChatDB[0]) => item.members.includes(decoded.email));
            let toClientChats = chats.map(chat => ({
                ...chat,
                members: chat.members.map(email => {
                    let user = userDB.find(user => user.email === email) as User;
                    return {
                        email: user.email,
                        name: user.name,
                        photo: user.photo,
                        lastActivity: user.lastActivity
                    };
                }),
                history: chat.history.map(message => {
                    let user = userDB.find(user => user.email === message.from) as User;
                    return {
                        ...message,
                        from: {
                            email: user.email,
                            name: user.name,
                            photo: user.photo,
                            lastActivity: user.lastActivity
                        }
                    };
                })
            }));


            if (idParam) {
                let toClientChat: Chat = toClientChats.find((item) => item.id === idParam) as any

                if (toClientChat) {
                    const response: JSONResponse = {status: "OK", data: [toClientChat]};
                    res.json(response);
                    return;
                } else {
                    const response: JSONResponse = {status: "ERROR"};
                    res.json(response);
                    return;
                }
            }
            const response: JSONResponse = {status: "OK", data: toClientChats};
            res.json(response);
            return;
        }
    });
}