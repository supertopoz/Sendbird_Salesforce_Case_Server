import  dotenv from 'dotenv';
dotenv.config();
import axios from "axios";
import { verify } from 'crypto';

const accepted_token_types = [
    "USER_CAN_USE_ONLY_ACCESS_TOKEN",
    "USER_CAN_ONLY_USE_SESSION_TOKEN",
    "USER_CAN_USE_SESSION_OR_ACCESS_TOKEN"
]

const SENDBIRD_APP_ID = process.env.SENDBIRD_APP_ID;
const SENDBIRD_API_TOKEN = process.env.SENDBIRD_API_TOKEN;

export const checkBody = (req, res, next) => {

    console.log(req.body);
    const required = ["Subject","Description","SuppliedName","SuppliedEmail"];

    const example2 = {
        "ContactId": "0032x000004fM8DAAU",
        "AccountId": "0012x0000082qL6AAI",
        "AssetId": "",
        "SuppliedName":"REQUIRED",
        "SuppliedEmail": "REQUIRED",
        "SuppliedPhone": "",
        "SuppliedCompany": "",
        "Type": "Mechanical",
        "Status": "New",
        "Reason": "Equipment Design",
        "Origin": "Web",
        "Subject": "Inadequate headroom with installation of aircon unit - REQUIRED",
        "Priority": "Medium",
        "Description": "Some description - REQUIRED",
        "Comments": ""
    };

    if (req.body.token_type == undefined) return res.status(400).send({error: true, code:400, message:"token_type required"})
    if (typeof req.body.token_type != "number") return res.status(400).send({error: true, code:400, message:"token_type should be a number"});
    if (req.body.token_type > 1) return res.status(400).send({error: true, code:400, message:"token_type 0 or 1"});
    if (req.body.case == undefined) return res.status(400).send({error: true, code:400, message:`A case object is required! See attached example`, case : example2});
    if (Array.isArray(req.body.case)) return res.status(400).send({error: true, code:400, message:`A case OBJECT is required! See attached example`, case : example2});
    if (typeof req.body.case != "object") return res.status(400).send({error: true, code:400, message:`A case OBJECT is required! See attached example`, case : example2});
    
    const keys = Object.keys(req.body.case);
    for (let i = 0; i < required.length; i++) {
        if(keys.indexOf(required[i]) < 0) return res.status(400).send({error: true, code:400, message:`Missing required case key(s)! See attached example`, case : example2});   
    }

    for (let i = 0; i < keys.length; i++){    
        if(example2[keys[i]] == undefined) return res.status(400).send({error: true, code:400, message:`Invalid case key found! See attached example`, case : example2});
    }
    next();
}

export const checkHeaders = (req, res, next) => {

    const token = req.headers.token;
    const user = req.headers.user;

    if (token == undefined) {
        res.status(401).send("Not Authorized! -- 'token' not supplied");
        return;
    } 
    if (user == undefined) {
        res.status(401).send("Not Authorized! -- 'user' not supplied");
        return;
    }
    next();
}

export const authenticateUser = (req, res, next) => {

    const incomingToken = req.headers.token;
    const user = req.headers.user;
    const tokenType = req.body.token_type;
    console.log("TOKEN TYPE:", tokenType);
    const result = {
        "access_token": "6550db16f840e515e5b579cec607cc5f11fea266",
        "session_tokens": [{
                "expires_at": 1636680335807,
                "session_token": "88b22115dbea765e174de026716b4d76036c9d34"
            },
            {
                "expires_at": 1636680313612,
                "session_token": "bc6489c56c6466375aa2583341ca84329b7c57f7"
            }
        ]
    }
    var config = {
        method: 'get',
        url: `https://api-${SENDBIRD_APP_ID}.sendbird.com/v3/users/${user}`,
        headers: {
            'Api-Token': SENDBIRD_API_TOKEN,
            'Content-Type': 'application/json'
        },
    };


    axios(config)
        .then(function (response) {
    
            const actualAccessToken = response.data.access_token;
            const actualSessionTokens = response.data.session_tokens;
            const verifyToken = (incomingToken, tokenType, actualAccessToken, actualSessionTokens) => {

                switch (tokenType){
                    case 0:
                    //"USER_CAN_USE_ONLY_ACCESS_TOKEN"
                    console.log("Case 0");
                    (incomingToken == actualAccessToken)? next() : res.status(400).send("Not authorized");
                    break
                    case 1:
                    //"USER_CAN_ONLY_USE_SESSION_TOKEN"
                    let notAuthorized = true;
                    for (let i = 0; i < actualSessionTokens.length; i ++){
                        const currentToken = actualSessionTokens[i].session_token; 
                        const expires_at = actualSessionTokens[i].expires_at;
                        const now = Date.now();
                        if (incomingToken == currentToken && expires_at > now ) {
                            notAuthorized = false;
                            next();
                        } 
                    }
                    if(notAuthorized) res.status(400).send("Not authorized");
                
                    break
                    // case 2:
                    //TODO
                    //"USER_CAN_USE_SESSION_OR_ACCESS_TOKEN"
                    // console.log("Case 2")

                    // break
                    default:
                        res.status(400).send("Not authorized")
                        console.log("Not valid token type")
                }
            }
            verifyToken(incomingToken, tokenType, actualAccessToken, actualSessionTokens)
          //  next();
        })
        .catch(function (error) {
            console.log(error)
            res.status(401).send("Authentication Error!");
            return;
        });
}