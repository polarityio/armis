module.exports = {
  name: 'Armis',
  acronym: 'AS',
  description: 'Search for Devices, Users, and Vulnerabilities in Armis',
  entityTypes: ['IPv4', 'IPv6', 'url', 'domain', 'cve', 'email', 'MAC'],
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
      name: 'Armis API URL',
      description: 'The base URL of the Armis API including the schema (i.e., https://)',
      default: '',
      type: 'text',
      userCanEdit: false,
      adminOnly: true
    },
    {
      key: 'secretKey',
      name: 'Secret Key',
      description: 'Your Secret Key',
      default: '',
      type: 'password',
      userCanEdit: false,
      adminOnly: true
    }
  ]
};
