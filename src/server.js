const express = require('express');
const bodyParser = require('body-parser');
const rp = require('request-promise');
const cors = require('cors');

const { imageOCR, imagePredict } = require('./apis');
const { measureImageStreamSize } = require('./imageLib');
const { synthesizeObi } = require('./sythesizeObi');

const app = express();
app.use(bodyParser.raw());
app.use(cors());

app.post('/echo', (req, res) => {
  res.send(req.body);
});

app.post('/ocr', (req, res) => {
  imageOCR(req.body)
    .then(x => {
      res.header('Content-Type', 'application/json')
      res.send(x);
    })
    .catch(e => {
      console.log('failed to ocr');
      res.status(400);
      res.send(e.message);
    })
});

app.post('/predict', (req, res) => {
  imagePredict(req.body)
    .then(x => {
      res.header('Content-Type', 'application/json')
      res.send(x);
    });
});

app.post('/obi', (req, res) => {
  const ocrPromise = imageOCR(req.body);
  const predictPromise = imagePredict(req.body);
  const inputSize = measureImageStreamSize(req.body);
  Promise.all([ocrPromise, predictPromise])
    .then(([ocrResult, predictResult]) => {
      return synthesizeObi(ocrResult, predictResult, inputSize);
    })
    .then(x => {
      res.header('Content-Type', 'application/json')
      res.send(x);
    })
})

app.post('/obi-e2e', (req, res) => {
  const ocrPromise = imageOCR(req.body);
  const predictPromise = imagePredict(req.body);
  const inputSize = measureImageStreamSize(req.body);
  Promise.all([ocrPromise, predictPromise])
    .then(([ocrResult, predictResult]) => {
      return synthesizeObi(ocrResult, predictResult, inputSize);
    })
    .then(x => {
      res.header('Content-Type', 'application/json')
      res.send(x);
      return x;
    })
    .then(x => {
      console.log('[SYNC] sync to runtime begin...');
      return rp({
        method: 'POST',
        uri: 'http://localhost:5000/api/hack/drawsome',
        header: {
          'Content-Type': 'application/json',
        },
        body: x,
        json: true,
      }).then(() => {
        console.log('[SYNC] finish sync file');
        return x;
      }).catch(e => {
        console.log('[SYNC] failed!', e.message);
      })
    });
})

app.listen(3008);
