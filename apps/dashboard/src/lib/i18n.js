import english from '../locales/en.json';

function lookup(messages, key) {
  return key.split('.').reduce((value, part) => value && value[part], messages);
}

export function createTranslator(messages = english) {
  return (key, variables = {}) => {
    const message = lookup(messages, key);
    if (typeof message !== 'string') return key;
    return message.replace(/\{(\w+)\}/g, (_, variable) => String(variables[variable] ?? `{${variable}}`));
  };
}

export const t = createTranslator();
