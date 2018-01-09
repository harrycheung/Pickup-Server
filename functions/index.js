
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const secureCompare = require('secure-compare');
const rp = require('request-promise-native');
const Cors = require("cors");
const express = require("express");
const gcs = require('@google-cloud/storage')();
const fileUpload = require("./file-upload");

const webKey = 'AIzaSyDyoOkwBMJ9A5faAScoRx5EFC0N4C9Fc1c';
const mbAccessKey = 'D4UXyvmRsrb6Q0VoYQd4qo60Y';

var messagebird = require('messagebird')(mbAccessKey);

const api = express().use(Cors({ origin: true }));
fileUpload("/uploadImage", api);

const serviceAccount = require('./service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://synapse-7afed.firebaseio.com',
});

exports.requestLogin = functions.https.onRequest((req, res) => {
  const signature = req.headers['x-signature'];
  const expectedSignature = crypto.createHmac('sha1', 'secret')
    .update(JSON.stringify(req.body, null, 0))
    .digest('hex');

  if (secureCompare(signature, expectedSignature)) {
    const phoneNumber = req.body.phoneNumber;
    const android = req.body.android;
    admin.auth().getUser(phoneNumber)
    .catch((error) => {
      return admin.auth().createUser({uid: phoneNumber});
    })
    .then((user) => {
      return admin.auth().createCustomToken(user.uid);
    })
    .then((token) => {
      var options = {
        method: 'POST',
        uri: 'https://firebasedynamiclinks.googleapis.com/v1/shortLinks',
        qs: {
          key: webKey,
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: {
          dynamicLinkInfo: {
            dynamicLinkDomain: 'yus8d.app.goo.gl',
            link: 'https://synpickup.com?token=' + token,
            androidInfo: {
              androidPackageName: 'harrycheung.synapse.pickup.android',
            },
            iosInfo: {
              iosBundleId: 'harrycheung.synapse.pickup.ios',
            }
          },
          suffix: {
            option: 'SHORT',
          },
        },
        json: true
      };

      return rp(options);
    })
    .then((response) => {
      // On success(200), rp returns the json parsed response.
      const shortToken = response.shortLink.split('/').pop();

      if (phoneNumber.indexOf('111111111') !== -1) {
        return shortToken;
      }

      const link = android ? `http://synpickup.com/x+${shortToken}` : `synapsepickup://+${shortToken}`;

      var params = {
        'originator': 'Synapse',
        'recipients': ['+1' + phoneNumber],
        'body': `Welcome to Synapse Pickup! Here is your magic link: ${link}`,
      };

      return new Promise((resolve, reject) => {
        messagebird.messages.create(params, function (err, data) {
          if (err) {
            reject(err);
          } else {
            resolve('Success!');
          }
        });
      });
    })
    .then((response) => {
      res.status(200).send(response);
    })
    .catch((error) => {
      console.error(error);
      res.status(403).send('Bad dynamic link');
    })
  } else {
    console.error('x-signature', signature, 'did not match', expectedSignature);
    res.status(403).send('Bad signature');
  }
});

exports.getLongToken = functions.https.onRequest((req, res) => {
  var options = {
    method: 'GET',
    uri: `https://yus8d.app.goo.gl/${req.query.token}`,
    followRedirect: false,
    resolveWithFullResponse: true,
  };

  rp(options)
  .then((response) => {
    // do nothing
  })
  .catch((error) => {
    if (error.statusCode === 302) {
      res.status(200).send(error.response.headers.location.split('token=').pop());
    } else {
      res.status(500).send('Error');
    }
  });
});

exports.redirect = functions.https.onRequest((req, res) => {
  const token = req.path.split('+')[1];
  res.redirect(`synapsepickup://+${token}`);
});

api.post("/uploadImage", function (req, response, next) {
  uploadImageToStorage(req.files.file[0])
  .then(metadata => {
    response.status(200).json(metadata[0]);
    next();
  })
  .catch(error => {
    console.error(error);
    response.status(500).json({ error });
    next();
  });
});

exports.api = functions.https.onRequest(api);

const uploadImageToStorage = file => {
  return new Promise((resolve, reject) => {
    console.log('Storing image');
    const fileUpload = gcs.bucket('synapse-7afed.appspot.com').file(`images/${file.originalname}`);
    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: "image/jpeg"
      }
    });

    blobStream.on("error", error => reject(error));

    blobStream.on("finish", () => {
      console.log('Image stored');
      fileUpload.getMetadata()
      .then(metadata => resolve(metadata))
      .catch(error => reject(error));
    });

    blobStream.end(file.buffer);
  });
}

// exports.uploadImage = functions.https.onRequest((req, res) => {
//   const file = req.files.file[0];
//   const storage = admin.storage();
//   return new Promise((resolve, reject) => {
//     const fileUpload = storage.bucket().file(file.originalname);
//     const blobStream = fileUpload.createWriteStream({
//       metadata: {
//         contentType: 'image/jpeg'
//       }
//     });
//
//     blobStream.on('error', error => reject(error));
//
//     blobStream.on('finish', () => {
//       fileUpload.getMetadata()
//       .then(metadata => resolve(metadata))
//       .catch(error => reject(error));
//     });
//
//     blobStream.end(file.buffer);
//   })
//   .then(metadata => {
//     res.status(200).json(metadata[0]);
//   })
//   .catch(error => {
//     console.error(error);
//     res.status(500).json({ error });
//   });
// });
