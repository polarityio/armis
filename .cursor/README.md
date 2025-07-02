# File Updates and Security Guidelines

## Updating Cursor Documentation Files

### `.cursor/docs/PRD.md` - Product Requirements Document 
**Required Fields to Fill In:**
  - _Username_: Enter your CYYNC staging system username
  - _Password_: Enter your CYYNC staging system password  
  - _Access Token_: Enter your CYYNC API access token
  - _CYYNC API Key_: Enter your CYYNC API key for integration authentication
  - _CYYNC Workspaces_: Enter workspace names or IDs to search within
  - _CYYNC Workspace Role-ID_: Enter the UUID of your workspace role
  - _Assets Entities_: Add example asset data for testing search functionality
  - _Forms Entities_: Add example form data for testing search functionality
  - _Pages Entities_: Add example page data for testing search functionality
  - _Tasks Entities_: Add example task data for testing search functionality

**Security Note:**
  - After updating these fields, ensure the file is marked as unchanged in git to prevent sensitive data from being tracked:
    ```bash
    git update-index --assume-unchanged .cursor/docs/PRD.md
    ```

### `.cursor/rules/personal-profile.mdc` - Personal Profile Document

**Required Fields to Fill In:**
  - _Name_: Update with your actual name
  - _Years of experience_: Update with your actual years of software development experience
  - _Company joining date_: Update with your actual company joining date
  - _Current role_: Update with your actual job title and responsibilities
  - _Primary development focus_: Update with your actual development focus areas
  - _Primary IDE_: Update with your preferred development environment
  - _Operating System_: Update with your actual operating system
  - _Shell_: Update with your preferred shell
  - _Package Manager preference_: Update with your preferred package manager
  - _Version Control_: Update with your preferred version control practices
  - _Programming Languages_: Update skill levels for JavaScript/Node.js, TypeScript, Python
  - _Web Technologies_: Update skill levels for HTML/CSS, Handlebars, LESS, REST APIs, GraphQL
  - _Polarity Integration Framework_: Update experience levels for integration development
  - _Security & Threat Intelligence_: Update experience levels for cybersecurity concepts
  - _DevOps & Infrastructure_: Update experience levels for Docker, Git, CI/CD
  - _Engineering Practices_: Update experience levels for Agile, TDD, code review, documentation
  - _Code Quality_: Update preferences for linting, code organization, error handling
  - _Security Practices_: Update experience levels for secure coding principles
  - _Current Focus Areas_: Update with your actual integration types and APIs
  - _Team Collaboration_: Update with your actual team size and processes
  - _Technical Communication_: Update preferences for explanation level and documentation style
  - _Problem-Solving Approach_: Update preferences for debugging and learning
  - _Feedback & Iteration_: Update preferences for code review and iteration
  - _Context-Specific Information_: Update with your actual integration deployment experience

**Security Note:**
  - After updating these fields, ensure the file is marked as unchanged in git to prevent personal information from being tracked:
    ```bash
    git update-index --assume-unchanged .cursor/rules/personal-profile.mdc
    ```
  
### `.cursor/docs/CYYNC API.postman_collection.json` - API Collection Document
**How to Obtain the Postman Collection:**
  - _Reach out to a Team Member_: Reach out to a team member to obtain the API collection
  - _Contact CYYNC Support_: Email support@cyync.com to request the API collection
  - _CYYNC Sales Team_: Contact sales@cyync.com if you need API access for integration Development

**Where to Place the Collection:**
  - _File Path_: Save the collection as `CYYNC API.postman_collection.json` in the `.cursor/docs/` directory
  - _File Structure_: Ensure the file is named exactly as specified for proper integration reference
  - _JSON Format_: Verify the file is in valid JSON format and can be imported into Postman

**Required Configuration:**
  - _Environment Variables_: Set up Postman environment variables for:
    - `base_url`: https://staging.cyync.com/api/v1 (or production URL)
    - `access_token`: Your CYYNC API access token
    - `role_id`: Your CYYNC workspace role UUID
  - _Collection Variables_: Update collection-level variables with your specific workspace details
  - _Authentication_: Configure Bearer token authentication using the access_token variable

**Security Note:**
  - After adding the collection, ensure the file is marked as unchanged in git to prevent sensitive data from being tracked:
    ```bash
    git update-index --assume-unchanged .cursor/docs/CYYNC\ API.postman_collection.json
    ```

### `.cursor/rules/partner-api.mdc` - Partner API Document
**How to Obtain the Postman Collection:**
  - _Reach out to a Team Member_: Reach out to a team member to obtain the API collection
  - _Contact CYYNC Support_: Email support@cyync.com to request the API collection
  - _CYYNC Sales Team_: Contact sales@cyync.com if you need API access for integration Development

**Where to Place the Collection:**
  - _File Path_: Save the collection as `partner-api.mdc` in the `.cursor/rules/` directory
  - _File Structure_: Ensure the file is named exactly as specified for proper integration reference
  - _Markdown Format_: Verify the file is in valid Markdown format and can be imported into Cursor

**Security Note:**
  - After adding the collection, ensure the file is marked as unchanged in git to prevent sensitive data from being tracked:
    ```bash
    git update-index --assume-unchanged .cursor/rules/partner-api.mdc
    ```


