'use latest';
import bodyParser from 'body-parser';
import jwt from 'express-jwt';
import express from 'express';
import Webtask from 'webtask-tools';
import { MongoClient } from 'mongodb';
import _ from 'lodash';

const collection = 'my-button-events';

const server = express();
server.use(bodyParser.json());

// uses client credentials for authorization on the POST
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


server.get('/', (req, res, next) => {
  MongoClient.connect(req.webtaskContext.secrets.mongoUrl, (err, db) => {
    if (err) return next(err);
    db.collection(collection)
        .find({},{})
          .toArray((err, result) => {
            db.close();
            if (err) return next(err);
            res.status(200).send(_.map(result,(i) => {
                                                        var events = {
                                                          "LONG": 'start sleep',
                                                          "SINGLE": 'self awake',
                                                          "DOUBLE": 'awake'
                                                        };
                                                        var owner = {
                                                          'G030JF0562426A1X': 'Eugenio'
                                                        };
                                                        return {
                                                                  who:owner[i.serialNumber],
                                                                  ts:i.dateTime,
                                                                  ev: events[i.clickType]
                                                                };
                                                      }));
    });
  });
});

module.exports = Webtask.fromExpress(server);
