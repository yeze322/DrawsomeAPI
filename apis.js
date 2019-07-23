const R = require('rxjs');
const rp = require('request-promise');

const OCR_AUTH_KEY = '15bf9b7d41784ad79b2bca872b141dff';

function imagePredict(imageStream) {
  const predictionAPI = {
    method: 'POST',
    uri: 'https://eastus.api.cognitive.microsoft.com/customvision/v3.0/Prediction/c8ac99b1-c73c-41a2-8d82-04bb7d381513/detect/iterations/Iteration2/image',
    headers: {
      'Prediction-Key': '9fd1acc62baf4273bc9f2d6b6ac4452f',
      'Content-Type': 'application/octet-stream',
    },
    body: imageStream,
  };

  return rp(predictionAPI)
    .then(x => JSON.parse(x))
    .catch(e => {
      console.log('Image Predict failed!');
      throw e;
    });
}

function imageOCR(imageStream) {
  const postOCR = {
    method: 'POST',
    uri: 'https://eastus.api.cognitive.microsoft.com/vision/v1.0/recognizeText?handwriting=true',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Ocp-Apim-Subscription-Key': OCR_AUTH_KEY,
    },
    body: imageStream,
    resolveWithFullResponse: true,
  }

  return rp(postOCR)
    .then(res => res.headers['operation-location'])
    .then(getResultUrl => {
      console.log('start fetching url: ', getResultUrl);
      const getOptions = {
        method: 'GET',
        uri: getResultUrl,
        headers: {
          'Ocp-Apim-Subscription-Key': OCR_AUTH_KEY,
        },
        json: true,
      };

      return retry(() => {
        return rp(getOptions)
          .then(x => {
            if (x.status === 'Succeeded') return x;
            else { throw new Error(x) };
          })
      }, 100, 3)
    });
}

const retry = (fn, ms, cnt = 3) => new Promise((resolve, reject) => { 
  fn()
    .then(resolve)
    .catch(e => {
      if (cnt <= 0) {
        console.log('maxium retry');
        reject(e);
        return;
      }

      setTimeout(() => {
        console.log('retrying...', cnt);
        retry(fn, ms, cnt - 1).then(resolve).catch(e => reject(e));
      }, ms);
    })
});

module.exports = {
  imageOCR,
  imagePredict,
}
