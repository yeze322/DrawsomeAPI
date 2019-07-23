const data = require('./json/recognition/412.json');
const { writeFileSync } = require('fs');

const NODE_TAG = 'node';
const TEXT_TAG = 'text';

const predictions = (data.predictions || [])
  .map(x => {
    Object.keys(x.boundingBox)
      .forEach(prop => x.boundingBox[prop] *= 1000);
    return x;
  });
const solidPredictions = predictions.filter(x => x.probability > 0.1);

const nodes = solidPredictions
  .filter(x => x.probability > 0.7)
  .filter(x => x.tagName === NODE_TAG);

const texts = solidPredictions.filter(x => x.tagName === TEXT_TAG);

console.log('nodes N = ', nodes.length);
console.log('nodes = ', organizeNodes(nodes));

// console.log('texts N = ', texts.length);
// console.log('texts = ', texts);

writeFileSync('./output.json', JSON.stringify(organizeNodes(nodes), null, '\t'));

function organizeNodes (nodes) {
  const MIN_INTERVAL_Y = 50;
  const yOrderedNodes = nodes.sort((a, b) => a.boundingBox.top > b.boundingBox.top);

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
    const relevantText = texts.find(t => judgeBoundingBoxCross(node.boundingBox, t.boundingBox));
    node.text = relevantText;
  }

  for (let level of levels) {
    level.sort((a, b) => a.boundingBox.left > b.boundingBox.left);
  }
  return levels;
}

function judgeBoundingBoxCross(box1, box2) {
  const TH = 50;

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

function synthesizeObi(ocrResult, predictResult, imageSize) {
  return {
    imageSize,
    ocrResult,
    predictResult,
  }
}

module.exports = {
  synthesizeObi,
}
