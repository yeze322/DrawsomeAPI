const SEND_ACTIVITY = 'Microsoft.SendActivity';
const TEXT_INPUT = 'Microsoft.TextInput';
const IF_ELSE = 'Microsoft.IfCondition';

function guessObi(text) {
  if (text && text[text.length - 1] === '?') {
    return {
      $type: TEXT_INPUT,
      prompt: text,
    }
  }
  return {
    $type: SEND_ACTIVITY,
    activity: text,
  };
}

module.exports = {
  guessObi,
}