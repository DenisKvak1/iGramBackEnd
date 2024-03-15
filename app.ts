import express, {Application, Request, Response} from 'express';
import http from 'http';
import WebSocket from 'ws';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import crypto from 'crypto';

const bodyParser = require('body-parser');
import {v4 as uuidv4} from 'uuid';
import {Chat, ChatDB, iCommandActionList, JSONResponse, LoginValue, options, User, UserDB} from "./env/types";
import {Options} from "express-ws";

class App {
    private app: Application;
    private server: http.Server;
    private wss: WebSocket.Server;
    private secretKey: string = '0fvXk&U@^U1%K]VwoxzBb)?–t!TmNC6Af7SQEjEh{uw,vo–&95u~YR~Yc0s:K;YQ';
    private userDBPath: string
    private chatDBPath: string
    private uploadPath: string
    private WSClients: Record<any, any>

    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = new WebSocket.Server({server: this.server});
        this.userDBPath = path.join(__dirname, 'dataBase.json')
        this.chatDBPath = path.join(__dirname, 'dataBaseChat.json')
        this.uploadPath = path.join(__dirname, 'uploads')
        this.WSClients = new Map()

        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
    }

    private setupMiddleware(): void {
        this.app.use(cors({
            origin: '*',
            exposedHeaders: ['application/json']
        }));
        this.app.use(express.json());
        this.app.use(bodyParser.urlencoded({extended: true}));
    }

    private setupRoutes(): void {
        this.app.use('/img', express.static(path.join(__dirname, 'img')))
        this.app.use('/uploads', express.static(this.uploadPath))
        this.app.post('/api/register', this.handleRegister.bind(this));
        this.app.post('/api/login', this.handleLogin.bind(this));
        this.app.get('/api/chats', this.handleGetChats.bind(this));
        this.app.get('/api/getFriendsInvite', this.handleGetFriendsInvite.bind(this));
        this.app.get('/api/getFriends', this.handleGetFriends.bind(this));
        this.app.get('/api/getUser', this.handleGetUser.bind(this));
        this.app.get('/api/checkValidToken', this.handleCheckValidToken.bind(this));
    }

    private setupWebSocket(): void {
        this.wss.on('connection', this.handleWebSocketConnection.bind(this));
    }

    private saveDataToJSONFile(data: any, filePath: string): void {
        try {
            const jsonData = JSON.stringify(data, null, 2);
            fs.writeFileSync(filePath, jsonData, 'utf8');
            console.log('Data successfully saved to', filePath);
        } catch (error) {
            console.error('Error writing data to', filePath, ':', error);
        }
    }

    private loadDataFromJSONFile(filePath: string): any {
        try {
            const jsonData = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(jsonData);
        } catch (error) {
            console.error('Error reading or parsing data from', filePath, ':');
            return null;
        }
    }

    private handleGetFriendsInvite(req: Request, res: Response) {
        let jwtToken: string | undefined = req.headers['authorization'];

        if (!jwtToken) {
            const response: JSONResponse = {status: "ERROR"};
            res.json(response);
            return;
        }

        let db: User[] = this.loadDataFromJSONFile(this.userDBPath);

        jwt.verify(jwtToken, this.secretKey, (err: any, decoded: any) => {
            if (!err) {
                let user: User = db.find((item: User) => item.email.toUpperCase() === decoded.email.toUpperCase()) as User;
                if (!user) {
                    const response: JSONResponse = {status: "ERROR"};
                    res.json(response);
                }
                let requests = user.friendsOutRequest.map(email => {
                    let friend = db.find(u => u.email === email);
                    if (!friend) {
                        return
                    }

                    return {
                        email: friend.email,
                        name: friend.name,
                        photo: friend.photo,
                        lastActivity: friend.lastActivity
                    };
                });

                const response: JSONResponse = {status: "OK", requests: requests as any};
                res.json(response);


                return;
            } else {
                const response: JSONResponse = {status: "ERROR"};
                res.json(response);
                return;
            }
        });
    }

    private handleGetFriends(req: Request, res: Response) {
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

    private handleGetUser(req: Request, res: Response) {
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

    private handleCheckValidToken(req: Request, res: Response) {
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

    private handleRegister(req: Request, res: Response): void {
        const {loginValue, options}: { loginValue: LoginValue; options: options } = req.body;

        if (!loginValue || !options) {
            const response: JSONResponse = {status: "ERROR", Error: "Не переданы нужные параметры"};
            res.json(response);
            return;
        }

        const emailRegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegExp = /^[a-zA-Z0-9!@#$%^&*()_+{}\[\]:;<>,.?~\\-]+$/;
        const nameRegExp = /^[a-zA-Zа-яА-Я]+(?:-[a-zA-Zа-яА-Я]+)*$/;

        if (
            !loginValue.email ||
            !loginValue.password ||
            !options.name ||
            !emailRegExp.test(loginValue.email) ||
            !passwordRegExp.test(loginValue.password) ||
            !nameRegExp.test(options.name)
        ) {
            const response: JSONResponse = {status: "ERROR", Error: "Параметры имеют неверный формат"};
            res.json(response);
            return;
        }

        let db: User[] = this.loadDataFromJSONFile(this.userDBPath);

        if (db.some((item: User) => loginValue.email.toUpperCase() === item.email.toUpperCase())) {
            const response: JSONResponse = {status: "ERROR", Error: "Аккаунт уже создан"};
            res.json(response);
            return;
        }

        db.push({
            email: loginValue.email,
            name: options.name,
            password: loginValue.password,
            friendsRequest: [],
            friendsOutRequest: [],
            friends: [],
            photo: "http://127.0.0.1:3000/img/standartAvatar.png",
        });

        this.saveDataToJSONFile(db, this.userDBPath);

        const token: string = jwt.sign({email: loginValue.email}, this.secretKey, {expiresIn: '10d'});

        const response: JSONResponse = {status: "OK", jwt: token, email: loginValue.email};
        res.json(response);
    }

    private handleGetChats(req: Request, res: Response) {
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

    private handleLogin(req: Request, res: Response): void {
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

    private handleWebSocketConnection(ws: WebSocket, req: http.IncomingMessage): void {
        const urlSearchParams = new URLSearchParams(req.url?.split('?')[1] || '');
        const jwtToken = urlSearchParams.get('token');

        if (!jwtToken) return
        let decoded: any
        jwt.verify(jwtToken, this.secretKey, (err: any, decoded2: any) => {
            if (!err) {
                decoded = decoded2

                const arrWs = this.WSClients.get(decoded.email) || [];
                this.WSClients.set(decoded.email, [...arrWs, ws]);
            }
        })
        if(!decoded) return;

        let chatDB: ChatDB = this.loadDataFromJSONFile(this.chatDBPath)
        let userDB: UserDB = this.loadDataFromJSONFile(this.userDBPath)
        let userI = userDB.findIndex((item) => item.email.toUpperCase() === decoded.email.toUpperCase())
        if(userI<0) return
        userDB[userI].lastActivity = new Date().toISOString()
        this.saveDataToJSONFile(userDB, this.userDBPath)

        const commandActionList: iCommandActionList = {
            message: (message) => {
                const {from, to, text} = message.payload;

                if (decoded.email !== from) {
                    return;
                }

                const chatIndex = chatDB.findIndex((item) => item.id === to);
                if (chatIndex < 0) {
                    return;
                }

                let user = userDB.find((item) => item.email === decoded.email);
                if (!user) return;

                chatDB[chatIndex].history.push({
                    from,
                    text,
                    fromName: user.name,
                    timestamp: new Date().toISOString(),
                });

                this.WSClients.forEach((wss: WebSocket[], key: string) => {
                    if (chatDB[chatIndex].members.includes(key)) {
                        wss.forEach((wsL: WebSocket) => {
                            wsL.send(
                                JSON.stringify({
                                    command: "message",
                                    payload: {
                                        from: {
                                            email: user?.email,
                                            name: user?.name,
                                            photo: user?.photo,
                                            lastActivity: user.lastActivity
                                        },
                                        fromName: user.name,
                                        to,
                                        text,
                                        timestamp: new Date().toISOString(),
                                    },
                                })
                            );
                        });
                    }
                });
            },
            friendRequest: (message) => {
                const {login} = message.payload;
                let userI = userDB.findIndex((item) => item.email.toUpperCase() === decoded.email.toUpperCase());

                let addUser = userDB.find(
                    (item) => item.email.toUpperCase() === login.toUpperCase()
                );
                let addUserI = userDB.findIndex(
                    (item) => item.email.toUpperCase() === login.toUpperCase()
                );

                if (!addUser || decoded.email.toUpperCase() === addUser.email.toUpperCase()) {
                    return;
                }

                if (
                    userDB[userI].friends.includes(addUser.email) ||
                    userDB[userI].friendsRequest.includes(addUser.email)
                ) {
                    return;
                }

                userDB[addUserI].friendsOutRequest.push(decoded.email);
                userDB[userI].friendsRequest.push(addUser.email);

                if (this.WSClients.has(login)) {
                    this.WSClients.get(login).forEach((wsL: WebSocket) => {
                        wsL.send(
                            JSON.stringify({
                                command: "friendRequest",
                                payload: {
                                    from: {
                                        email: addUser.email,
                                        name: addUser.name,
                                        photo: addUser.photo,
                                        lastActivity: addUser.lastActivity
                                    },
                                    name: userDB[userI].name,
                                },
                            })
                        );
                    });
                }
            },
            friendResponse: (message) => {
                const {login, accept} = message.payload;
                let userI = userDB.findIndex((item) => item.email.toUpperCase() === decoded.email.toUpperCase());
                let requestUserI = userDB.findIndex((item) => item.email.toUpperCase() === login.toUpperCase());

                if (requestUserI < 0 || !userDB[userI].friendsOutRequest.includes(login)) {
                    return;
                }

                userDB[userI].friendsOutRequest = userDB[userI].friendsOutRequest.filter((item) => item !== login);
                userDB[requestUserI].friendsRequest = userDB[requestUserI].friendsRequest.filter((item) => item !== decoded.email);

                if (!accept) {
                    if (this.WSClients.has(login)) {
                        this.WSClients.get(login).forEach((wsL: WebSocket) => {
                            wsL.send(
                                JSON.stringify({
                                    command: "friendResponse",
                                    payload: {
                                        from: decoded.email,
                                        name: userDB[userI].name,
                                        accept,
                                    },
                                })
                            );
                        });
                    }

                    this.saveDataToJSONFile(userDB, this.userDBPath);
                    this.saveDataToJSONFile(chatDB, this.chatDBPath);
                    return;
                }

                userDB[userI].friends.push(login);
                userDB[requestUserI].friends.push(decoded.email);

                if (this.WSClients.has(login)) {
                    this.WSClients.get(login).forEach((wsL: WebSocket) => {
                        wsL.send(
                            JSON.stringify({
                                command: "friendResponse",
                                payload: {
                                    from: decoded.email,
                                    name: userDB[userI].name,
                                    accept,
                                },
                            })
                        );
                    });
                }
            },
            removeFriend: (message) => {
                const {login} = message.payload;
                let userI = userDB.findIndex((item) => item.email.toUpperCase() === decoded.email.toUpperCase());
                let requestUserI = userDB.findIndex((item) => item.email.toUpperCase() === login.toUpperCase());

                if (!userDB[userI].friends.includes(login)) {
                    return;
                }

                userDB[userI].friends = userDB[userI].friends.filter((item) => item !== login);
                userDB[requestUserI].friends = userDB[requestUserI].friends.filter((item) => item !== decoded.email);

                if (this.WSClients.has(login)) {
                    this.WSClients.get(login).forEach((wsL: WebSocket) => {
                        wsL.send(
                            JSON.stringify({
                                command: "removeFriend",
                                payload: {
                                    from: decoded.email,
                                    name: userDB[userI].name,
                                },
                            })
                        );
                    });
                }
            },
            groupCreated: (message) => {
                const {logins, groupName}: { logins: Array<string>, groupName: string } = message.payload as any;

                let userI = userDB.findIndex((item) => item.email.toUpperCase() === decoded.email.toUpperCase());

                let error;
                logins.forEach((item) => {
                    if (!userDB[userI].friends.includes(item)) {
                        error = true;
                    }
                });

                if (error) {
                    return;
                }

                let newGroup: {
                    id: string;
                    groupName: string;
                    members: string[];
                    photo: string;
                    history: any[];
                } = {
                    id: uuidv4(),
                    groupName: groupName,
                    members: [...logins, decoded.email],
                    photo: "http://127.0.0.1:3000/img/standartAvatar.png",
                    history: [],
                };

                chatDB.push(newGroup);

                logins.forEach((item) => {
                    if (this.WSClients.has(item)) {
                        this.WSClients.get(item).forEach((wsL: WebSocket) => {
                            wsL.send(
                                JSON.stringify({
                                    command: "groupCreated",
                                    payload: {
                                        from: decoded.email,
                                        group: newGroup,
                                    },
                                })
                            );
                        });
                    }
                });

                if (this.WSClients.has(decoded.email)) {
                    this.WSClients.get(decoded.email).forEach((wsL: WebSocket) => {
                        wsL.send(
                            JSON.stringify({
                                command: "groupCreated",
                                payload: {
                                    from: decoded.email,
                                    group: newGroup,
                                },
                            })
                        );
                    });
                }
            },
            friendAddedToGroup: (message) => {
                const {login, chatID} = message.payload;

                let userI = userDB.findIndex((item) => item.email.toUpperCase() === decoded.email.toUpperCase());
                let chatI = chatDB.findIndex((item) => item.id === chatID);
                let addUser = userDB.find((item)=>item.email.toUpperCase() === login.toUpperCase())

                if(!addUser){
                    return;
                }
                if (userI < 0 || chatI < 0) {
                    return;
                }

                if (!userDB[userI].friends.includes(login)) {
                    return;
                }

                if (chatDB[chatI].members.includes(login)) {
                    return;
                }

                chatDB[chatI].members.push(login);

                this.WSClients.forEach((wss: any, key: any) => {
                    if (chatDB[chatI]?.members.includes(key) || key === decoded.email) {
                        wss.forEach((wsL: WebSocket) => {
                            wsL.send(
                                JSON.stringify({
                                    command: "friendAddedToGroup",
                                    payload: {
                                        user: {
                                            email: addUser.email,
                                            name: addUser.name,
                                            photo: addUser.photo,
                                            lastActivity: addUser.lastActivity
                                        },
                                        chatID: chatDB[chatI].id,
                                    },
                                })
                            );
                        });
                    }
                });
            },
            setGroupPhoto: (message) => {
                const {chatID} = message.payload;
                if (!chatID) return;

                let chat = chatDB.find((item) => item.id === chatID);
                let chatI = chatDB.findIndex((item => item.id === chatID));


                if (!chat?.members.includes(decoded.email)) return;

                const fileName = `${crypto.createHash('sha256').update(chatDB[chatI].id).digest('hex')}.png`;
                const buf = Object.values(message.payload.photo);
                const buffer = Buffer.from(buf as any);
                const uploadPath = path.join(__dirname, 'uploads');

                if (!fs.existsSync(uploadPath)) {
                    fs.mkdirSync(uploadPath);
                }
                const filePath = path.join(uploadPath, fileName);

                fs.writeFile(filePath, buffer, (err) => {
                    if (err) {
                        console.error('Error saving file:', err);
                        return;
                    }
                    chatDB[chatI].photo = `http://127.0.0.1:3000/uploads/${fileName}`;
                    this.saveDataToJSONFile(chatDB, this.chatDBPath);
                    this.WSClients.forEach((wss: any, key: any) => {
                        if (chatDB[chatI].members.includes(key)) {
                            wss.forEach((wsL: WebSocket) => {
                                wsL.send(
                                    JSON.stringify({
                                        command: "setGroupPhoto",
                                        payload: {
                                            chatID: chatDB[chatI].id,
                                            photo: `http://127.0.0.1:3000/uploads/${fileName}`,
                                        },
                                    })
                                );
                            });
                        }
                    });
                });
            },
            setUserPhoto: (message) => {
                const {photo} = message.payload;
                if (!photo) return;

                let userI = userDB.findIndex((item) => item.email === decoded.email);
                const fileName = `${crypto.createHash('sha256').update(userDB[userI].email).digest('hex')}.png`;
                const buf = Object.values(message.payload.photo);
                const buffer = Buffer.from(buf as any);
                const uploadPath = path.join(__dirname, 'uploads');

                if (!fs.existsSync(uploadPath)) {
                    fs.mkdirSync(uploadPath);
                }
                const filePath = path.join(uploadPath, fileName);

                fs.writeFile(filePath, buffer, (err) => {
                    if (err) {
                        console.error('Error saving file:', err);
                        return;
                    }
                    userDB[userI].photo = `http://127.0.0.1:3000/uploads/${fileName}`;
                    this.saveDataToJSONFile(userDB, this.userDBPath);
                    this.WSClients.forEach((wss: any, key: any) => {
                        if (userDB[userI].friends.includes(key) || userDB[userI].email === decoded.email) {
                            wss.forEach((wsL: WebSocket) => {
                                wsL.send(
                                    JSON.stringify({
                                        command: "setUserPhoto",
                                        payload: {
                                            login: userDB[userI].email,
                                            photo: `http://127.0.0.1:3000/uploads/${fileName}`,
                                        },
                                    })
                                );
                            });
                        }
                    });
                });
            },
            leaveGroup: (message) => {
                const {chatID} = message.payload;

                const chatI = chatDB.findIndex((item) => item.id === chatID);
                const user = userDB.find((item) => item.email === decoded.email)
                if (!chatDB) return;
                if (!user) return;
                chatDB[chatI].members = chatDB[chatI].members.filter((item) => item !== decoded.email);
                if (chatDB[chatI].members.length === 0) {
                    chatDB.splice(chatI, 1);
                }
                this.WSClients.forEach((wss: any, key: any) => {
                    if (chatDB[chatI]?.members.includes(key) || key === decoded.email) {
                        wss.forEach((wsL: WebSocket) => {
                            wsL.send(
                                JSON.stringify({
                                    command: "leaveGroup",
                                    payload: {
                                        chatID,
                                        user: {
                                            email: user.email,
                                            name: user.name,
                                            photo: user.photo,
                                            lastActivity: user.lastActivity
                                        },
                                    },
                                })
                            );
                        });
                    }
                });
            }
        }
        const sendActivityInfo = ()=>{
            this.WSClients.forEach((wss: any, key: any) => {
                if (userDB[userI].friends.includes(key) || userDB[userI].email === decoded.email) {
                    wss.forEach((wsL: WebSocket) => {
                        wsL.send(
                            JSON.stringify({
                                command: "activity",
                                payload: {
                                    user: {
                                        email: userDB[userI].email,
                                        name: userDB[userI].name,
                                        photo: userDB[userI].photo,
                                        lastActivity: userDB[userI].lastActivity
                                    }
                                },
                            })
                        );
                    });
                }
            });
        }
        sendActivityInfo()
        ws.on('message', (message: any) => {
            if (!decoded) return;
            message = JSON.parse(message.toString())
            chatDB = this.loadDataFromJSONFile(this.chatDBPath)
            userDB = this.loadDataFromJSONFile(this.userDBPath)
            let userI = userDB.findIndex((item) => item.email.toUpperCase() === decoded.email.toUpperCase())
            userDB[userI].lastActivity = new Date().toISOString()

            commandActionList[message.command](message)
            sendActivityInfo()
            this.saveDataToJSONFile(userDB, this.userDBPath);
            this.saveDataToJSONFile(chatDB, this.chatDBPath);
        })


        ws.on('close', () => {
            if (!decoded) return
            this.WSClients.get(decoded.email).splice(this.WSClients.get(decoded.email).indexOf(ws), 1)
        });
    }

    public startServer(): void {
        const PORT = process.env.PORT || 3000;
        this.server.listen(PORT, () => {
            console.log(`Server running on http://0.0.0.0:${PORT}`);
        });

    }
}

const myApp = new App();
myApp.startServer();
