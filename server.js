const express = require('express');
const bodyParser = require('body-parser');

const { imageOCR, imagePredict } = require('./apis');
const { measureImageStreamSize } = require('./imageLib');
const { synthesizeObi } = require('./sythesizeObi');

const app = express();
app.use(bodyParser.raw());

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

app.listen(3008);
