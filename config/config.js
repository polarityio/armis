module.exports = {
  name: 'CYYNC',
  acronym: 'CYYNC',
  description: 'Search for Assets and Forms in CYYNC, along with their comments',
  entityTypes: ['IPv4', 'domain', 'MD5', 'MAC'],
  customTypes: [
    {
      key: 'allText',
      regex: '\\S[\\s\\S]{1,20}\\S'
    }
  ],
  defaultColor: 'light-blue',
  onDemandOnly: true,
  styles: ['./client/styles.less'],
  block: {
    component: {
      file: './client/block.js'
    },
    template: {
      file: './client/block.hbs'
    }
  },
  request: {
    cert: '',
    key: '',
    passphrase: '',
    ca: '',
    proxy: '',
    rejectUnauthorized: true
  },
  logging: {
    level: 'info'
  },
  options: [
    {
      key: 'url',
      name: 'CYYNC API URL',
      description: 'The URL for your CYYNC API instance',
      default: '',
      type: 'text',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'accessToken',
      name: 'Access Token',
      description: 'Your CYYNC API Access Token (Base64 encoded credentials)',
      default: '',
      type: 'password',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'roleId',
      name: 'Role ID',
      description: 'Your Role ID in CYYNC that you want to use in your search.',
      default: '',
      type: 'text',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'workspaceIds',
      name: 'Workspace IDs',
      description:
        'Your Workspace IDs in a comma separated list that you want to search.',
      default: '',
      type: 'text',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'searchLimit',
      name: 'Search Limit',
      description:
        'The maximum number of results to return. Note: If you are searching for more than one type, this limit applies to all types combined.',
      default: 50,
      type: 'number',
      userCanEdit: true,
      adminOnly: false
    },
    {
      key: 'searchScopes',
      name: 'Search Scopes',
      description: 'Select which data types to search in CYYNC',
      type: 'select',
      multiple: true,
      options: [
        {
          value: 'assets',
          display: 'Assets'
        },
        {
          value: 'forms',
          display: 'Forms'
        }
      ],
      default: ['assets', 'forms'],
      userCanEdit: true,
      adminOnly: false
    }
  ]
};
