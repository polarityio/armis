module.exports = {
  name: 'Armis',
  acronym: 'AS',
  description: 'TODO',
  entityTypes: ['IPv4', 'domain'],
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
    proxy: ''
  },
  logging: {
    level: 'info'
  },
  options: [
    {
      key: 'url',
      name: 'Intezer API URL',
      description:
        'The base URL of the Intezer API including the schema (i.e., https://)',
      default: 'https://analyze.intezer.com',
      type: 'text',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'apiKey',
      name: 'API Key',
      description: 'Your API Key',
      default: '',
      type: 'password',
      userCanEdit: false,
      adminOnly: true
    }
  ]
};
  