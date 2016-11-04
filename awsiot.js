'use latest';
import bodyParser from 'body-parser';
import jwt from 'express-jwt';
import express from 'express';
import Webtask from 'webtask-tools';
import { MongoClient } from 'mongodb';

const collection = 'my-button-events';

const server = express();
server.use(bodyParser.json());

server.use((req,res,next)=>{
  jwt({
    secret: "-----BEGIN CERTIFICATE-----\n" + req.webtaskContext.secrets.issuerPublicKey.match(/.{1,64}/g).join('\n') + "\n-----END CERTIFICATE-----\n",
    algorithms: ['RS256'],
    issuer: req.webtaskContext.secrets.issuer,
    audience: req.webtaskContext.secrets.audience
  })(req,res,next);
});

server.post('/', (req, res, next) => {
  
  var buttonEvent = req.body;
  buttonEvent.dateTime = new Date(); //add timestamp
  
  MongoClient.connect(req.webtaskContext.secrets.mongoUrl, (err, db) => {
    if (err) return next(err);
    db.collection(collection).insertOne(buttonEvent, (err, result) => {
      db.close();
      if (err) return next(err);
      res.status(201).send(result);
    });
  });
});

module.exports = Webtask.fromExpress(server);
