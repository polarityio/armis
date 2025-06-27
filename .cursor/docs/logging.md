# Session-Based Logging Rule

**Task: Implement structured logging so each application run writes to a separate file in the `logs/` directory.**

## Context: Scripts vs Polarity Integrations

### Script Logging
- **Purpose**: Debugging CLI scripts, test runners, development utilities
- **Location**: `logs/<timestamp>.log` files in project root
- **Format**: Structured JSON or delimited text for AI-friendly parsing
- **Scope**: Individual script execution sessions
- **Control**: Environment variables or CLI flags for enabling/disabling

### Polarity Integration Logging
- **Purpose**: Debugging integration behavior within Polarity platform
- **Location**: `logs/integration.log` (default Polarity location)
- **Format**: JSON format using Bunyan logger (Polarity standard)
- **Scope**: Integration lifecycle and entity lookups
- **Control**: Config.js logging configuration and Polarity platform settings

## File Existence Check
```bash
ls logs .gitignore
```

## Directory & Git Ignore
1. Ensure `logs/` directory exists at project root
2. Confirm `logs` is listed in `.gitignore` so log files are never committed

## Log File Per Run

### For Scripts
1. Generate timestamp `YYYY-MM-DD-HH-MM-SS` on startup
2. Create `logs/<timestamp>.log` and append all log output
3. Subsequent runs create new files, preserving previous logs

### For Polarity Integrations
1. Use standard Polarity logging via Logger object in `startup()` method
2. Logs automatically written to `logs/integration.log`
3. Use Bunyan for formatting: `tail -f integration.log | bunyan -o short`

## Log Content

### Script Logging Content
- Use `pino` or `winston`, or simple file writes if unavailable
- Record start/end of major operations, successful paths, handled errors, unexpected failures
- Include environment info: CLI arguments, Node version
- Focus on script execution flow and external API interactions

### Polarity Integration Logging Content
- Use Logger object passed to `startup()` method
- Log integration initialization, entity processing, API calls, error handling
- Include entity information, API responses, integration state
- Focus on entity lookup operations and integration lifecycle events

## Toggle Mechanism

### Script Logging Control
- Logging enabled by default
- Environment variable `LOG_LEVEL=off` or CLI flag `--no-log` to disable
- When disabled, skip creating log file and suppress output

### Polarity Integration Logging Control
- Configure in `config/config.js`:
  ```javascript
  module.exports = {
    logging: {
      level: 'info' // 'trace', 'debug', 'info', 'warn', 'error'
    }
  };
  ```
- Use Polarity platform settings for global control
- Integration logs managed by Polarity server infrastructure

## AI-Friendly Format

### Script Log Format
- Prefer structured lines (JSON or delimited text) for AI ingestion
- Include level, timestamp, message
- Example:
  ```json
  {"level":"info","timestamp":"2024-01-15T10:30:00Z","message":"Script started","args":["--verbose","--api-key","***"]}
  ```

### Polarity Integration Log Format
- Use Bunyan-compatible JSON format
- Include entity type, lookup results, API endpoints
- Example:
  ```json
  {"level":30,"time":"2024-01-15T10:30:00.000Z","msg":"Entity lookup started","entity":{"value":"192.168.1.1","isIPv4":true}}
  ```

## Logging Best Practices

### Script Logging Best Practices
- **Session Isolation**: Each script run gets its own log file
- **Structured Data**: Use JSON format for machine-readable logs
- **Error Context**: Include stack traces and error details
- **Performance Metrics**: Log timing information for operations
- **Environment Info**: Include Node version, platform, configuration

### Polarity Integration Logging Best Practices
- **Entity Context**: Always log entity information for debugging
- **API Interactions**: Log request/response details for external APIs
- **Error Handling**: Log both handled and unhandled errors
- **Performance**: Log lookup timing and caching behavior
- **Integration State**: Log initialization and configuration loading

## Log Analysis Tools

### Script Log Analysis
- Use `grep`, `jq`, or custom parsing scripts
- AI tools can easily parse structured JSON logs
- Search by timestamp, log level, or specific keywords

### Polarity Integration Log Analysis
- Use Bunyan CLI: `tail -f integration.log | bunyan -o short`
- Filter by log level: `bunyan -l error integration.log`
- Search for specific entities: `bunyan integration.log | grep "192.168.1.1"`

## Integration with Memory System

### Script Logging and Memory
- Log successful patterns for documentation in `.cursor/docs/memory/lessons-learned.md`
- Document failure patterns in `.cursor/docs/memory/failure-patterns.md`
- Use logs to identify common issues and solutions

### Polarity Integration Logging and Memory
- Log integration-specific patterns for future reference
- Document API interaction patterns and error handling approaches
- Use logs to improve integration reliability and performance

**REMEMBER: Logs must capture both happy paths and errors. Maintain readability while providing enough detail for effective troubleshooting. Choose appropriate logging approach based on scripts vs Polarity integrations.**