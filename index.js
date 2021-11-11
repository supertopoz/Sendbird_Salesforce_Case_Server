import  dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import axios from "axios";
import sf from "node-salesforce";
import { checkHeaders, checkBody, authenticateUser } from './middle_ware.js';

const SALEFORCE_URL = process.env.SALEFORCE_URL;
//https://help.salesforce.com/s/articleView?id=000334996&type=1
const SALESFORCE_API_VERSION = process.env.SALESFORCE_API_VERSION;
const SALESFORCE_SYSTEM_ADMINISTRATOR_EMAIL = process.env.SALESFORCE_SYSTEM_ADMINISTRATOR_EMAIL;
const SALESFORCE_SYSTEM_ADMINISTRATOR_AUTH = process.env.SALESFORCE_SYSTEM_ADMINISTRATOR_AUTH;
const SENDBIRD_APP_ID = process.env.SENDBIRD_APP_ID;
const SENDBIRD_API_TOKEN = process.env.SENDBIRD_API_TOKEN;

const app = express();
app.use(express.json())

const port = process.env.PORT || 3000;

app.use(express.json())

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//use user authentication token to autentiticate tokens below. 
//Fetch all token types. 

app.get('/', (req, res) => res.status(200).send('Server up and running!'));

app.post("/createticket", checkHeaders, checkBody, authenticateUser, (async (req,res) => {

  const userId = req.headers.user;
  const newCase = req.body.case;

  const auth = await getSalesforceAccessToken();
  if(!auth.accessToken) return res.status(400).send("Error! Salesforce! No auth!");

  const salesforceCase = await createCase(auth.accessToken, newCase);
  console.log(salesforceCase);
  if (!salesforceCase.success) return res.status(400).send("Case not created!");

  const channelUrl = salesforceCase.id;
  const channel = await createChannel(channelUrl, userId);
  if(channel.error) return res.status(400).send("Channel not created!");

  res.status(200).send(channel.channel);
 //   res.status(200).send("OK")
}));


const getSalesforceAccessToken = () => {
    return new Promise((resolve, reject) => {
        var conn = new sf.Connection({ loginUrl: SALEFORCE_URL });
        conn.login(SALESFORCE_SYSTEM_ADMINISTRATOR_EMAIL, SALESFORCE_SYSTEM_ADMINISTRATOR_AUTH, (result) => {
            resolve(conn)
        });
    });
};

const createCase = async function (token, data) {

    const body = data;
    const headers = {
            "headers": {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
           }
    };
    const url = `${SALEFORCE_URL}/services/data/v${SALESFORCE_API_VERSION}/sobjects/Case`;
    try {
        const result = await axios.post(url, body, headers);
        return result.data;
    } catch (e) {
        return { id: undefined, success: false, errors: e };
    }
};

const createChannel = async function(channel_url, userId) {

    const data = { channel_url, user_ids: [userId]};
    const headers = {"headers": {
        "Api-Token": SENDBIRD_API_TOKEN,
        "Content-Type": "text/plain"
    }
    }
    const url = `https://api-${SENDBIRD_APP_ID}.sendbird.com/v3/group_channels`; 
    try {
        const channel = await axios.post(url, data, headers);
        return { success: true, channel: channel.data, error: undefined }
    } catch (e){
        return { success: false, channel: undefined, error: e }
    }
};

app.get("*", (req, res) =>{
  res.sendStatus(200);
});

app.listen(process.env.PORT || port, () => console.log(`Example app listening on port ${port}!`));