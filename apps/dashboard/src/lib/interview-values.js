export function presentationValue(value, answerType) {
  if (value === null || value === undefined) return answerType === 'tags' || answerType === 'multiple_choice' ? [] : '';
  return value;
}

export function persistenceValue(value) {
  if (typeof value === 'string' && !value.trim()) return null;
  if (Array.isArray(value) && value.length === 0) return null;
  return value;
}

export function questionErrors(errors, questionId) {
  return (errors || []).filter((error) => error.startsWith(`${questionId} `) || error.startsWith(`${questionId}.`) || error.startsWith(`${questionId}:`));
}

export function errorMap(errors) {
  return (errors || []).reduce((map, error) => {
    const [questionId] = error.split(/[ .:]/, 1);
    if (questionId) map[questionId] = [...(map[questionId] || []), error];
    return map;
  }, {});
}
