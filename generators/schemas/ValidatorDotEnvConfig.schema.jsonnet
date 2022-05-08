local urlPattern = 'https?://.+?:\\d+';

local validatorConfig = {
  VALIDATED_CONFIG_STRICTNESS_LEVEL: {
    type: 'string',
    default: 'warn',
    enum: ['full', 'warn', 'none'],
    description: 'use this envvar to control load-time verbosity',
  },
};

{
  type: 'object',
  description: '.env config for schema validator',
  properties: (
    validatorConfig
  ),
}
