const ObiTemplate = require('../static/ObiTemplate.json');

const { writeFileSync } = require('fs');

const NODE_TAG = 'node';
const TEXT_TAG = 'text';

// const result = synthesizeObi(ocr, data, { width: 1080, height: 1440 });
// writeFileSync('./output.json', JSON.stringify(result, null, '\t'));

function processPredictionData(data) {  
  const predictions = (data.predictions || [])
    .map(x => {
      Object.keys(x.boundingBox)
      .forEach(prop => x.boundingBox[prop] *= 1000);
      return x;
    });
  const solidPredictions = predictions.filter(x => x.probability > 0.1);
  
  const nodes = solidPredictions
    .filter(x => x.probability > 0.5)
    .filter(x => x.tagName === NODE_TAG);
  return nodes;
}

function processOCRData(data, imageSize) {
  const lines = data.recognitionResult.lines || [];
  return lines.map(line => {
    const flatRec = line.boundingBox;
    line.boundingBox = {
      left: flatRec[0] / imageSize.width * 1000,
      top: flatRec[1] / imageSize.height * 1000,
      width: (flatRec[4] - flatRec[0]) / imageSize.width * 1000,
      height: (flatRec[5] - flatRec[1]) / imageSize.height * 1000,
    }
    return line;
  });
}


function synthesizeObi(ocrResult, predictResult, imageSize) {
  const nodes = processPredictionData(predictResult);
  const texts = processOCRData(ocrResult, imageSize);

  nodes.forEach(n => {
    const relevantText = texts.find(t => judgeBoundingBoxCross(n.boundingBox, t.boundingBox));
    if (relevantText) {
      n.text = relevantText.text;
    }
  });

  return buildObi(nodes);
}

function buildObi(nodes) {
  const levels = levelNodes(nodes);
  writeFileSync('./levels.json', JSON.stringify(levels, null, '\t'));
  const SEND_ACTIVITY = 'Microsoft.SendActivity';
  const IF_ELSE = 'Microsoft.IfCondition';

  const steps = [];

  let prevStep
  let prevLevel

  for (let lv of levels) {
    if (lv.length === 1) {
      const newStep = {
        $type: SEND_ACTIVITY,
        activity: lv[0].text,
      };
      steps.push(newStep);
      prevStep = newStep;

    } else if (lv.length >= 2) {
      const step1 = {
        $type: SEND_ACTIVITY,
        activity: lv[0].text,
      };
      const step2 = {
        $type: SEND_ACTIVITY,
        activity: lv[1].text,
      };

      if (prevLevel && prevLevel.length > 1) { // already exists a IfCondition
        prevStep.steps = [...(prevStep.steps || []), step1];
        prevStep.elseSteps = [...(prevStep.elseSteps || []), step2];
      } else {  // need to create one
        const newStep = {
          $type: IF_ELSE,
          condition: 'true',
          steps: [step1],
          elseSteps: [step2],
        };

        steps.push(newStep);
        prevStep = newStep;
      }
    }

    prevLevel = lv;
  }

  const json = JSON.parse(JSON.stringify(ObiTemplate));
  json.steps = steps;
  return json;
}

function levelNodes (nodes) {
  const MIN_INTERVAL_Y = 50;
  const yOrderedNodes = nodes.sort((a, b) => a.boundingBox.top - b.boundingBox.top);

  const levels = [];
  let prevLevel = [];
  let prevBaseline = 0;

  for(let node of yOrderedNodes) {
    if (node.boundingBox.top - prevBaseline > MIN_INTERVAL_Y) {
      const newLevel = [node];
      levels.push(newLevel);
      prevLevel = newLevel;
      prevBaseline = node.boundingBox.top;
    } else {
      prevLevel.push(node);
    }
  }

  for (let level of levels) {
    level.sort((a, b) => a.boundingBox.left > b.boundingBox.left);
  }
  return levels;
}

function judgeBoundingBoxCross(box1, box2) {
  const TH = 0;

  const toRect = box => [box.left, box.top, box.left + box.width, box.top + box.height];
  const rec1 = toRect(box1);
  const rec2 = toRect(box2);

  return !(
    rec1[2] - rec2[0] <= TH ||   // left
    rec1[3] - rec2[1] <= TH ||   // bottom
    rec1[0] - rec2[2] >= -TH ||  // right
    rec1[1] - rec2[3] >= -TH     // top
  );
}

module.exports = {
  synthesizeObi,
}
