export const MODELS = [
  {
    value:       'gpt-4o-mini',
    label:       'GPT-4o mini',
    provider:    'OpenAI',
    description: 'Fast & cheap',
    free:        false,
    disabled:    false,
  },
  {
    value:       'gpt-4o',
    label:       'GPT-4o',
    provider:    'OpenAI',
    description: 'Most capable',
    free:        false,
    disabled:    false,
  },
  {
    value:       'gpt-3.5-turbo',
    label:       'GPT-3.5 Turbo',
    provider:    'OpenAI',
    description: 'Balanced',
    free:        false,
    disabled:    false,
  },
  {
    value:       'llama-3.1-8b',
    label:       'Llama 3.1 8B',
    provider:    'Groq',
    description: 'Fastest',
    free:        true,
    disabled:    false,
  },
  {
    value:       'llama-3.3-70b',
    label:       'Llama 3.3 70B',
    provider:    'Groq',
    description: 'Best quality',
    free:        true,
    disabled:    false,
  },
  {
    value:       'mixtral-8x7b',
    label:       'Mixtral 8x7B',
    provider:    'Groq',
    description: 'Balanced',
    free:        true,
    disabled:    false,
  },
] as const

export type ModelValue = typeof MODELS[number]['value']

const MODEL_LABEL = Object.fromEntries(MODELS.map(m => [m.value, m.label]))

export const getModelLabel = (value: string): string =>
  MODEL_LABEL[value] ?? value