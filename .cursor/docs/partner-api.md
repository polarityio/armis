# CYYNC Partner API Documentation

## Base Configuration

- **Base URL**: `https://staging.cyync.com/api/v1`
- **Authentication**: Bearer Token (Base64 encoded credentials)
- **Content-Type**: `application/json`
- **Required Headers**:
  - `Authorization`: `Bearer {base64_credentials}`
  - `Role-ID`: `{workspace_role_uuid}` (Required for workspace operations)
  - `Content-Type`: `application/json`

## Authentication

### Bearer Token Authentication
```bash
# Using provided API token (Base64 encoded username:password)
Authorization: Bearer cG9sYXJpdHk6Q1ktQjNSUDBZRVJFa0dOUld2dVpYSVBHc0hwblJRdThGS0M=
```

**Note**: The token is Base64 encoded `polarity:CY-B3RP0YEREkGNRWvuZXIPGsHpnRQu8FKC`

## Workspace Configuration

- **Workspace ID**: `d8e6acf3-e996-4e20-8619-8bf17dfe7ec1`
- **Role ID**: `ab3f5779-6ea8-418d-bdd6-7d287cd7f78e`

## Search Endpoints

### 1. Assets Search ✅ VERIFIED WORKING

**Endpoint**: `GET /workspaces/{workspace_id}/assets/`

**Parameters**:
- `search` (string): Search term to match against asset data
- `type` (string): Asset type filter (optional, can be empty)
- `limit` (integer): Maximum results to return (optional)
- `offset` (integer): Pagination offset (optional)

**Example Request**:
```bash
curl 'https://staging.cyync.com/api/v1/workspaces/d8e6acf3-e996-4e20-8619-8bf17dfe7ec1/assets/?search=192.168.27.150&type=' \
  -H 'Authorization: Bearer cG9sYXJpdHk6Q1ktQjNSUDBZRVJFa0dOUld2dVpYSVBHc0hwblJRdThGS0M=' \
  -H 'Role-ID: ab3f5779-6ea8-418d-bdd6-7d287cd7f78e' \
  -H 'Content-Type: application/json'
```

**Test Results**:
- `192.168.27.150` - ✅ Returns 1 result (Endpoint asset)
- `d41d8cd98f00b204e9800998ecf8427e` - ✅ Returns 1 result (Hash reference in asset description)

### 2. Forms Search ✅ VERIFIED WORKING

**Endpoint**: `GET /workspaces/{workspace_id}/forms/`

**Parameters**:
- `search` (string): Search term to match against form data
- `type` (string): Form type filter (optional, can be empty)
- `limit` (integer): Maximum results to return (optional)
- `offset` (integer): Pagination offset (optional)

**Example Request**:
```bash
curl 'https://staging.cyync.com/api/v1/workspaces/d8e6acf3-e996-4e20-8619-8bf17dfe7ec1/forms/?search=192.168.27.150&type=' \
  -H 'Authorization: Bearer cG9sYXJpdHk6Q1ktQjNSUDBZRVJFa0dOUld2dVpYSVBHc0hwblJRdThGS0M=' \
  -H 'Role-ID: ab3f5779-6ea8-418d-bdd6-7d287cd7f78e' \
  -H 'Content-Type: application/json'
```

**Test Results**:
- `192.168.27.150` - ✅ Returns 1 result ("Suspicious Activity related to 192.168.27.150")
- `d41d8cd98f00b204e9800998ecf8427e` - No results (0 matches)
- `attacker-c2` - No results (0 matches)
- `Malware` - No results (0 matches)

### 3. Pages Search ✅ ENDPOINT WORKING

**Endpoint**: `GET /workspaces/{workspace_id}/pages/`

**Parameters**:
- `search` (string): Search term to match against page data
- `type` (string): Page type filter (optional, can be empty)
- `limit` (integer): Maximum results to return (optional)
- `offset` (integer): Pagination offset (optional)

**Example Request**:
```bash
curl 'https://staging.cyync.com/api/v1/workspaces/d8e6acf3-e996-4e20-8619-8bf17dfe7ec1/pages/?search=192.168.27.150&type=' \
  -H 'Authorization: Bearer cG9sYXJpdHk6Q1ktQjNSUDBZRVJFa0dOUld2dVpYSVBHc0hwblJRdThGS0M=' \
  -H 'Role-ID: ab3f5779-6ea8-418d-bdd6-7d287cd7f78e' \
  -H 'Content-Type: application/json'
```

**Test Results**:
- Endpoint responds correctly but workspace currently contains 0 pages
- Search functionality works (returns `{"count": 0, "results": []}`)

### 4. Tasks Search ✅ ENDPOINT WORKING

**Endpoint**: `GET /workspaces/{workspace_id}/tasks/`

**Parameters**:
- `search` (string): Search term to match against task data (optional)
- `type` (string): Task type filter (optional, can be empty)
- `limit` (integer): Maximum results to return (optional)
- `offset` (integer): Pagination offset (optional)

**Example Request**:
```bash
curl 'https://staging.cyync.com/api/v1/workspaces/d8e6acf3-e996-4e20-8619-8bf17dfe7ec1/tasks/?search=192.168.27.150&type=' \
  -H 'Authorization: Bearer cG9sYXJpdHk6Q1ktQjNSUDBZRVJFa0dOUld2dVpYSVBHc0hwblJRdThGS0M=' \
  -H 'Role-ID: ab3f5779-6ea8-418d-bdd6-7d287cd7f78e' \
  -H 'Content-Type: application/json'
```

**Test Results**:
- Endpoint responds correctly but workspace currently contains 0 tasks
- Search functionality works (returns `{"count": 0, "results": []}`)

## Response Format

All endpoints return JSON responses with the following structure:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "uuid",
      "object_type": "string",
      "workspace": {
        "id": "uuid",
        "title": "string",
        "description": "string"
      },
      "title": "string",
      "description": "string",
      "type": {
        "id": "uuid",
        "title": "string",
        "workflow": {}
      },
      "status": {
        "id": "uuid",
        "title": "string",
        "state": "string"
      },
      "priority": "string",
      "tags": [],
      "attributes": [
        {
          "key": "string",
          "value": "string",
          "display": "string"
        }
      ],
      "team": {
        "id": "uuid",
        "title": "string"
      },
      "created_by": {
        "id": "uuid",
        "display_name": "string",
        "username": "string"
      },
      "canAdd": true,
      "canModify": true,
      "canAssess": false,
      "createdAt": "iso_date",
      "updatedAt": "iso_date"
    }
  ]
}
```

## Working Test Entities

### Assets (Verified Working)
- `192.168.27.150` ✅ - Returns endpoint asset data
- `d41d8cd98f00b204e9800998ecf8427e` ✅ - Returns asset containing this hash
- `attacker-c2` ✅ - Returns asset containing this domain reference
- `203.0.113.15` - Test needed

### Forms (Verified Working)
- `192.168.27.150` ✅ - Returns 1 result ("Suspicious Activity related to 192.168.27.150")
- `Ms17-010` - No matching data
- `SMB` - No matching data  
- `SSL` - No matching data
- `11.12.13.14` - No matching data

## Error Handling

- **401 Unauthorized**: Invalid credentials or expired token
- **403 Forbidden**: Invalid or expired token, insufficient permissions
- **404 Not Found**: Workspace or resource not found
- **500 Internal Server Error**: Server error

## Rate Limiting

The API may implement rate limiting. Check response headers for rate limit information.

## Integration Implementation Notes

1. **Authentication**: Use Bearer token format, NOT Basic Auth
2. **Role-ID Required**: All workspace operations require the `Role-ID` header
3. **Trailing Slashes**: Forms, tasks, pages, and assets endpoints require trailing slashes
4. **Search Logic**: Search is case-insensitive and searches across multiple fields
5. **Empty Results**: Endpoints return valid responses even when no data matches
6. **Data Availability**: Both assets and forms have searchable data in the test workspace
7. **Response Structure**: All endpoints follow consistent pagination structure

## Critical URL Format Notes

⚠️ **IMPORTANT**: All endpoints require trailing slashes or will return 301 redirects:

- ✅ **Correct**: `/workspaces/{id}/assets/`
- ❌ **Incorrect**: `/workspaces/{id}/assets`
- ✅ **Correct**: `/workspaces/{id}/forms/`
- ❌ **Incorrect**: `/workspaces/{id}/forms`

## Successful API Test Summary

| Endpoint | Status | Test Entity | Results |
|----------|--------|-------------|---------|
| Assets | ✅ Working | `192.168.27.150` | 1 result |
| Assets | ✅ Working | `d41d8cd98f00b204e9800998ecf8427e` | 1 result |
| Assets | ✅ Working | `attacker-c2` | 1 result |
| **Forms** | ✅ **Working** | `192.168.27.150` | **1 result** |
| Forms | ✅ Working | `d41d8cd98f00b204e9800998ecf8427e` | 0 results |
| Pages | ✅ Working | Any search | 0 results (no pages in workspace) |
| Tasks | ✅ Working | Any search | 0 results (no tasks in workspace) |

**All endpoints are functional with correct trailing slash URLs and ready for integration implementation.**
