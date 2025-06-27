# Polarity Integration Framework Guide

**Task: Understand Polarity integration framework architecture: server/client structure, backend hooks, onMessage functionality, frontend components.**

## Framework Overview

Server/client architecture separating backend data processing from frontend display logic.

### Core Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Polarity      │    │   Integration   │    │   External      │
│   Platform      │◄──►│   Backend       │◄──►│   APIs          │
│                 │    │   (Server)      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   User          │
│   (Client)      │◄──►│   Interface     │
│                 │    │                 │
└─────────────────┘    └─────────────────┘
```

## Directory Structure

```
integration-root/
├── integration.js              # Main entry point
├── package.json                # Dependencies and metadata
├── config/config.json          # Integration configuration
├── server/                     # Backend logic
│   ├── onMessage/             # Message handlers
│   ├── queries/               # API query functions
│   └── userOptions/           # Configuration validation
├── client/                     # Frontend components
│   ├── block.js               # Component logic
│   ├── block.hbs              # Handlebars template
│   └── styles.less            # Custom styling
├── test/                      # Test files
└── logs/                      # Integration logs
```

## Backend Architecture

### Main Entry Point (`integration.js`)

```javascript
const { size, map } = require('lodash/fp');
const {
  logging: { setLogger, getLogger },
  errors: { parseErrorToReadableJson }
} = require('polarity-integration-utils');

const { validateOptions } = require('./server/userOptions');
const { queryIocs } = require('./server/queries');
const assembleLookupResults = require('./server/assembleLookupResults');
const onMessageFunctions = require('./server/onMessage');

const doLookup = async (entities, options, cb) => {
  const Logger = getLogger();
  try {
    const iocs = await queryIocs(entities, options);
    const lookupResults = assembleLookupResults(entities, iocs, options);
    cb(null, lookupResults);
  } catch (error) {
    const err = parseErrorToReadableJson(error);
    Logger.error({ error, formattedError: err }, 'Lookup Failed');
    cb({ detail: error.message || 'Lookup Failed', err });
  }
};

const onDetails = async (lookupObject, options, cb) => {
  try {
    lookupObject.data.details.iocs = await Promise.all(
      map(async (ioc) => {
        const tabName = size(ioc.case_ids) ? 'relatedCases' : size(ioc.alert_ids) ? 'relatedAlerts' : '';
        const { relatedData } = size(ioc.case_ids) || size(ioc.alert_ids)
          ? await onMessageFunctions.getTabContent({ idsToGet: size(ioc.case_ids) ? ioc.case_ids : ioc.alert_ids, tabName }, options, () => {})
          : { relatedData: null };
        return relatedData ? { ...ioc, [tabName]: relatedData, __activeTabState: tabName } : ioc;
      }, lookupObject.data.details.iocs)
    );
    cb(null, lookupObject.data);
  } catch (error) {
    cb(null, lookupObject.data);
  }
};

const onMessage = ({ action, data: actionParams }, options, callback) =>
  onMessageFunctions[action](actionParams, options, callback);

module.exports = {
  startup: setLogger,
  validateOptions,
  doLookup,
  onDetails,
  onMessage
};
```

### Required Backend Functions

```javascript
// Validate user configuration
const validateOptions = (options) => {
  const errors = [];
  if (!options.apiKey) errors.push('API Key is required');
  if (!options.url) errors.push('API URL is required');
  return errors;
};

// Main entity processing
const doLookup = async (entities, options, callback) => {
  try {
    // 1. Validate entities, 2. Query APIs, 3. Transform data, 4. Return results
    callback(null, results);
  } catch (error) {
    callback(error);
  }
};

// Load additional data on demand
const onDetails = async (lookupObject, options, callback) => {
  try {
    // Update lookupObject.data with new information
    callback(null, lookupObject.data);
  } catch (error) {
    callback(null, lookupObject.data);
  }
};

// Handle client-server communication
const onMessage = ({ action, data }, options, callback) => {
  switch (action) {
    case 'getTabContent': return handleGetTabContent(data, options, callback);
    case 'submitEdit': return handleSubmitEdit(data, options, callback);
    default: return callback(new Error(`Unknown action: ${action}`));
  }
};
```

### Server Organization

```javascript
// server/onMessage/getTabContent.js
const getTabContent = async ({ idsToGet, tabName }, options, callback) => {
  try {
    const relatedData = await getRelatedDataByIds[tabName](idsToGet, options);
    callback(null, { relatedData });
  } catch (error) {
    callback({ errors: [{ err: error, detail: error.message || `${tabName} Lookup Failed` }] });
  }
};

// server/queries/index.js
const queryIocs = async (entities, options) => {
  const results = await Promise.all(entities.map(entity => querySingleIoc(entity, options)));
  return results.filter(result => result !== null);
};
```

### Polarity Integration Utils

```javascript
const {
  logging: { setLogger, getLogger },
  errors: { parseErrorToReadableJson }
} = require('polarity-integration-utils');

const Logger = getLogger();
Logger.debug('Debug message');
Logger.error('Error message');

try {
  // Some operation
} catch (error) {
  const formattedError = parseErrorToReadableJson(error);
  Logger.error({ error, formattedError }, 'Operation failed');
}
```

## Frontend Architecture

### Component Logic (`client/block.js`)

```javascript
'use strict';

polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  iocs: Ember.computed.alias('details.iocs'),
  
  actions: {
    changeTab: function (index, tabName) {
      this.getTabContent(index, tabName);
    }
  },
  
  getTabContent: function (index, tabName) {
    if ((this.get(`iocs.${index}.${tabName}`) || []).length) {
      this.set(`iocs.${index}.__activeTabState`, tabName);
      return;
    }

    this.set(`iocs.${index}.__gettingTabStates.${tabName}`, true);
    const idsToGet = this.get(`iocs.${index}.case_ids`);

    this.sendIntegrationMessage({
      action: 'getTabContent',
      data: { idsToGet, tabName }
    })
    .then(({ relatedData }) => {
      this.set(`iocs.${index}.${tabName}`, relatedData);
      this.set(`iocs.${index}.__activeTabState`, tabName);
    })
    .catch((err) => {
      this.set(`iocs.${index}.__getTabErrorMessageStates.${tabName}`, `Failed: ${err.detail || 'Unknown'}`);
    })
    .finally(() => {
      this.set(`iocs.${index}.__gettingTabStates.${tabName}`, false);
      this.get('block').notifyPropertyChange('data');
    });
  }
});
```

### Template (`client/block.hbs`)

```handlebars
<div class="integration">
  <div class="summary">{{summary}}</div>
  {{#each iocs as |ioc index|}}
    <div class="ioc-item">
      <h4>{{ioc.value}}</h4>
      <div class="tabs">
        <button {{action 'changeTab' index 'relatedCases'}} disabled={{ioc.__gettingTabStates.relatedCases}}>
          Cases ({{ioc.case_ids.length}})
        </button>
      </div>
      <div class="content">
        {{#if ioc.__gettingTabStates.relatedCases}}
          <div class="loading">Loading...</div>
        {{else if ioc.relatedCases}}
          {{#each ioc.relatedCases as |case|}}
            <div><h5>{{case.title}}</h5><p>{{case.description}}</p></div>
          {{/each}}
        {{/if}}
        {{#if ioc.__getTabErrorMessageStates.relatedCases}}
          <div class="error">{{ioc.__getTabErrorMessageStates.relatedCases}}</div>
        {{/if}}
      </div>
    </div>
  {{/each}}
</div>
```

### Styling (`client/styles.less`)

```less
.integration {
  font-family: -apple-system, sans-serif;
  
  .summary {
    margin-bottom: 20px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 4px;
  }
  
  .ioc-item {
    margin-bottom: 20px;
    border: 1px solid #e1e5e9;
    border-radius: 4px;
    
    h4 { margin: 0; padding: 15px; background-color: #f8f9fa; }
  }
  
  .tabs button {
    padding: 12px 16px;
    background: none;
    border: none;
    cursor: pointer;
    &:disabled { opacity: 0.6; cursor: not-allowed; }
  }
  
  .content {
    padding: 15px;
    .loading { text-align: center; color: #666; }
    .error { color: #dc3545; background-color: #f8d7da; padding: 10px; border-radius: 4px; }
  }
}
```

### Frontend Limitations

**Ember.js Constraints:**
- No ES6 modules, use traditional JavaScript
- Use `Ember.computed.alias()` for data binding
- Define actions in `actions` object
- Use `this.set()` and `this.get()` for state

**Polarity Constraints:**
- Cannot import npm packages in frontend
- Use `sendIntegrationMessage()` for backend communication
- Use Ember templating system only

## Configuration (`config/config.json`)

```json
{
  "polarityIntegrationUuid": "unique-uuid-here",
  "name": "Integration Name",
  "acronym": "IN",
  "entityTypes": ["domain", "url", "email", "ipv4"],
  "onDemandOnly": true,
  "styles": ["./client/styles.less"],
  "block": {
    "component": { "file": "./client/block.js" },
    "template": { "file": "./client/block.hbs" }
  },
  "options": [
    {
      "key": "apiKey",
      "name": "API Key",
      "type": "password",
      "adminOnly": true
    }
  ]
}
```

## Communication Patterns

### Client to Server

```javascript
this.sendIntegrationMessage({
  action: 'getTabContent',
  data: { idsToGet: [1, 2, 3], tabName: 'relatedCases' }
})
.then((response) => this.set('data', response.relatedData))
.catch((error) => console.error('Failed:', error));
```

### Server to Client

```javascript
const getTabContent = async ({ idsToGet, tabName }, options, callback) => {
  try {
    const relatedData = await fetchRelatedData(idsToGet, options);
    callback(null, { relatedData });
  } catch (error) {
    callback({ errors: [{ err: error, detail: error.message }] });
  }
};
```

### Error Handling

```javascript
// Backend
try {
  const result = await riskyOperation();
  callback(null, result);
} catch (error) {
  const formattedError = parseErrorToReadableJson(error);
  callback({ detail: error.message, err: formattedError });
}

// Frontend
.catch((error) => {
  const errorMessage = error.detail || error.message || 'Unknown error';
  this.set('errorMessage', errorMessage);
});
```

## Testing

### Test Runner
```javascript
// test-runner.js
const myIntegration = require('./integration');
const options = { apiKey: process.env.API_KEY };
const entities = [{ value: 'example.com', isDomain: true }];

myIntegration.doLookup(entities, options, function(err, result) {
  if (err) console.info("ERRORS:", JSON.stringify(err, null, 4));
  else console.info("RESULTS:", JSON.stringify(result, null, 4));
});
```

## Best Practices

**Code Organization:** Separate backend/frontend, use modular functions, handle errors gracefully
**Performance:** Lazy loading, caching, respect rate limits, set timeouts
**Security:** Validate inputs, protect API keys, sanitize errors, use HTTPS
**UX:** Show loading states, clear error messages, responsive design

## Common Patterns

```javascript
// Tab loading
actions: {
  changeTab: function(index, tabName) {
    if (this.get(`data.${index}.${tabName}`)) return;
    this.sendIntegrationMessage({ action: 'getTabContent', data: { index, tabName } });
  }
}

// Form submission
actions: {
  submitForm: function(formData) {
    this.sendIntegrationMessage({ action: 'submitForm', data: formData });
  }
}
```

## Troubleshooting

**Common Issues:**
1. Integration not loading: Check `package.json` main property
2. Template not rendering: Verify Handlebars syntax
3. API calls failing: Check authentication
4. Component not responding: Ensure proper Ember patterns

**Debugging:** Check `logs/integration.log`, browser console, use `test-runner.js`, monitor network tab

**REMEMBER: Focus on clean backend/frontend separation, proper error handling, and user-friendly interfaces.**
