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
import {ChatDB, clientMessage, iCommandActionList, UserDB} from "../env/types";
import {handleCheckValidToken} from "./routes/checkValidTokenRoute";
import {handleGetUser} from "./routes/getUserRoute";
import {handleGetFriends} from "./routes/getFriendsRoute";
import {handleGetFriendsInvite} from "./routes/getFriendsInviteRoute";
import {handleGetChats} from "./routes/getChatsRoute";
import {handleLogin} from "./routes/loginRoute";
import {handleRegister} from "./routes/RegisterRoute";
import {friendRequestWS} from "./webSocketRoutes/friendRequestRoute";
import {messageWS} from "./webSocketRoutes/messageRoute";
import {friendResponseWS} from "./webSocketRoutes/friendResponseRoute";
import {removeFriendWS} from "./webSocketRoutes/removeFriendRoute";
import {friendAddedToChatWS} from "./webSocketRoutes/friendAddedToChatRoute";
import {leaveChatWS} from "./webSocketRoutes/leaveChatRoute";
import {setUserPhotoWS} from "./webSocketRoutes/setUserPhotoRoute";
import {setChatPhotoWS} from "./webSocketRoutes/setChatPhotoRoute";

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
        this.userDBPath = path.join(__dirname, 'db/dataBase.json')
        this.chatDBPath = path.join(__dirname, 'db/dataBaseChat.json')
        this.uploadPath = path.join(__dirname, '../uploads')
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
        this.app.use('/img', express.static(path.join(__dirname, '../img')))
        this.app.use('/uploads', express.static(this.uploadPath))
        this.app.post('/api/register', handleRegister.bind(this));
        this.app.post('/api/login', handleLogin.bind(this));
        this.app.get('/api/chats', handleGetChats.bind(this));
        this.app.get('/api/getFriendsInvite', handleGetFriendsInvite.bind(this));
        this.app.get('/api/getFriends', handleGetFriends.bind(this));
        this.app.get('/api/getUser', handleGetUser.bind(this));
        this.app.get('/api/checkValidToken', handleCheckValidToken.bind(this));
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

        const commandActionList: any = {
            message: (chatDB:ChatDB,userDB:UserDB, message:clientMessage, decoded: any)=>messageWS.bind(this)(chatDB, userDB, message, decoded),
            friendRequest: (chatDB:ChatDB,userDB:UserDB, message:clientMessage, decoded: any)=>friendRequestWS.bind(this)(chatDB, userDB, message, decoded),
            friendResponse: (chatDB:ChatDB,userDB:UserDB, message:clientMessage, decoded: any)=>friendResponseWS.bind(this)(chatDB, userDB, message, decoded),
            removeFriend: (chatDB:ChatDB,userDB:UserDB, message:clientMessage, decoded: any)=>friendRequestWS.bind(this)(chatDB, userDB, message, decoded),
            chatCreated: (chatDB:ChatDB,userDB:UserDB, message:clientMessage, decoded: any)=>removeFriendWS.bind(this)(chatDB, userDB, message, decoded),
            friendAddedToChat: (chatDB:ChatDB,userDB:UserDB, message:clientMessage, decoded: any)=>friendAddedToChatWS.bind(this)(chatDB, userDB, message, decoded),
            setChatPhoto: (chatDB:ChatDB,userDB:UserDB, message:clientMessage, decoded: any)=>setChatPhotoWS.bind(this)(chatDB, userDB, message, decoded),
            setUserPhoto: (chatDB:ChatDB,userDB:UserDB, message:clientMessage, decoded: any)=>setUserPhotoWS.bind(this)(chatDB, userDB, message, decoded),
            leaveChat: (chatDB:ChatDB,userDB:UserDB, message:clientMessage, decoded: any)=>leaveChatWS.bind(this)(chatDB, userDB, message, decoded),
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

            commandActionList[message.command](chatDB, userDB, message, decoded)
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
