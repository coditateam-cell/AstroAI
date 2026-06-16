# Requirements Document

## Introduction

This document outlines the requirements for enhancing the chart display after onboarding to show all detailed report data from the `birth_charts` table's `detailed_report` column, organized into user-friendly sections for love, career, personal, and any other fields that exist.

## Glossary

- **Detailed Report**: JSONB data stored in the `birth_charts` table containing narrative content organized by life areas (personal, career, love) and time periods (past, current, future)
- **Section**: A distinct category of content in the detailed report (e.g., personal, career, love)
- **Timeline**: A time period filter within a section (past, current, future)
- **Narrative View**: User-facing display of detailed report content with section tabs and timeline filters
- **Technical View**: Display of raw chart data (planets, houses, angles) for users interested in astronomical details

## Requirements

### 1.1 Purpose
Enhance the chart display after onboarding to show all detailed report data from the `birth_charts` table's `detailed_report` column, organized into user-friendly sections for love, career, personal, and any other fields that exist.

### 1.2 Scope
- Parse and display detailed report data from the backend
- Organize content into sections (love, career, personal, etc.)
- Provide tab navigation between sections
- Provide timeline filtering (past, current, future)
- Maintain existing chart display functionality
- Handle missing or malformed data gracefully

### 1.3 Out of Scope
- Modifying the backend chart computation logic
- Changing the database schema
- Adding new AI report generation features
- Implementing user annotations or notes
- Adding translation or localization features

## 2. Stakeholders

### 2.1 Primary Stakeholders
- **End Users**: People who view their birth charts and detailed reports
- **Product Team**: Responsible for feature requirements and UX decisions
- **Development Team**: Implementing the enhancement

### 2.2 Secondary Stakeholders
- **Design Team**: Ensuring consistent visual design
- **QA Team**: Testing the enhancement
- **DevOps Team**: Monitoring production performance

## 3. Functional Requirements

### 3.1 Data Retrieval

#### FR-1: Fetch Chart Data
**Priority**: High  
**Description**: The system shall fetch chart data including the detailed report from the backend API.  
**Acceptance Criteria**:
- System retrieves chart data via `/chart/{chart_id}` endpoint
- System handles API errors gracefully
- System displays error message if data cannot be retrieved

#### FR-2: Parse Detailed Report
**Priority**: High  
**Description**: The system shall parse the `detailed_report` JSONB field from the database.  
**Acceptance Criteria**:
- System correctly parses valid JSONB structure
- System handles null or undefined values
- System provides fallback content for missing sections

### 3.2 Data Organization

#### FR-3: Detect Available Sections
**Priority**: High  
**Description**: The system shall dynamically detect available sections in the detailed report.  
**Acceptance Criteria**:
- System identifies known sections (personal, career, love)
- System identifies any additional sections
- System prioritizes known sections in display order

#### FR-4: Normalize Section Structure
**Priority**: High  
**Description**: The system shall normalize all sections to have past, current, and future content.  
**Acceptance Criteria**:
- Each section has `past`, `current`, and `future` properties
- Missing content is replaced with fallback text
- Empty strings are replaced with fallback text

### 3.3 User Interface

#### FR-5: Display Section Tabs
**Priority**: High  
**Description**: The system shall display tabs for each available section.  
**Acceptance Criteria**:
- Each section has a dedicated tab
- Active tab is visually distinct
- Tab labels are user-friendly (e.g., "Personal Life")

#### FR-6: Display Timeline Filters
**Priority**: High  
**Description**: The system shall display timeline filters for each section.  
**Acceptance Criteria**:
- Three timeline options: past, current, future
- Active timeline is visually distinct
- Timeline selection updates displayed content

#### FR-7: Display Content
**Priority**: High  
**Description**: The system shall display the detailed report content for the selected section and timeline.  
**Acceptance Criteria**:
- Content is displayed in a clean, readable format
- Content transitions smoothly when section or timeline changes
- Content is properly formatted with line breaks

#### FR-8: Toggle Technical View
**Priority**: Medium  
**Description**: The system shall allow users to toggle between narrative view and technical view.  
**Acceptance Criteria**:
- Toggle button is visible and functional
- Technical view shows raw chart data (planets, houses, angles)
- Technical view does not interfere with narrative view

### 3.4 Error Handling

#### FR-9: Handle Missing Data
**Priority**: High  
**Description**: The system shall handle cases where detailed report data is missing.  
**Acceptance Criteria**:
- System displays fallback content for missing sections
- System logs errors for debugging
- System does not crash on missing data

#### FR-10: Handle Malformed Data
**Priority**: High  
**Description**: The system shall handle cases where detailed report data is malformed.  
**Acceptance Criteria**:
- System catches parse errors
- System displays fallback content for malformed data
- System logs errors for debugging

#### FR-11: Handle Network Errors
**Priority**: High  
**Description**: The system shall handle network errors during data retrieval.  
**Acceptance Criteria**:
- System displays error message for network failures
- System provides retry functionality
- System does not hang indefinitely

### 3.5 Performance

#### FR-12: Load Time
**Priority**: Medium  
**Description**: The system shall load detailed report data within acceptable time limits.  
**Acceptance Criteria**:
- Initial render completes within 500ms
- Section switching completes within 100ms
- Timeline filtering completes within 50ms

#### FR-13: Memory Usage
**Priority**: Low  
**Description**: The system shall manage memory efficiently.  
**Acceptance Criteria**:
- Total bundle size increase < 50KB
- No memory leaks during extended use
- Efficient rendering of large content

## 4. Non-Functional Requirements

### 4.1 Usability

#### NFR-1: Intuitive Navigation
**Priority**: High  
**Description**: Users shall be able to navigate between sections and timelines intuitively.  
**Acceptance Criteria**:
- Tab navigation is self-explanatory
- Timeline filters are clearly labeled
- Active selections are visually indicated

#### NFR-2: Responsive Design
**Priority**: High  
**Description**: The system shall work on various screen sizes.  
**Acceptance Criteria**:
- Layout adapts to mobile screens
- Touch targets are appropriately sized
- Text is readable on all screen sizes

### 4.2 Reliability

#### NFR-3: Error Recovery
**Priority**: High  
**Description**: The system shall recover gracefully from errors.  
**Acceptance Criteria**:
- System continues to function after non-critical errors
- Error messages are user-friendly
- System state is consistent after error recovery

#### NFR-4: Data Consistency
**Priority**: High  
**Description**: The system shall maintain data consistency.  
**Acceptance Criteria**:
- Displayed data matches API response
- No stale data is shown
- Updates are reflected immediately

### 4.3 Performance

#### NFR-5: Smooth Animations
**Priority**: Medium  
**Description**: The system shall provide smooth animations.  
**Acceptance Criteria**:
- Transitions are 60fps
- No jank during scrolling
- Animations complete within expected time

#### NFR-6: Efficient Rendering
**Priority**: Medium  
**Description**: The system shall render efficiently.  
**Acceptance Criteria**:
- No unnecessary re-renders
- Virtual scrolling for long content
- Optimized image loading (if applicable)

### 4.4 Security

#### NFR-7: XSS Protection
**Priority**: High  
**Description**: The system shall protect against XSS attacks.  
**Acceptance Criteria**:
- All user content is properly escaped
- No script execution in displayed content
- Content Security Policy is enforced

#### NFR-8: Secure Data Transmission
**Priority**: High  
**Description**: The system shall transmit data securely.  
**Acceptance Criteria**:
- All API calls use HTTPS
- Sensitive data is encrypted
- Authentication tokens are secured

### 4.5 Maintainability

#### NFR-9: Code Quality
**Priority**: Medium  
**Description**: The system shall maintain high code quality.  
**Acceptance Criteria**:
- Code follows project conventions
- Type definitions are complete
- Comments explain complex logic

#### NFR-10: Test Coverage
**Priority**: Medium  
**Description**: The system shall have adequate test coverage.  
**Acceptance Criteria**:
- Unit tests cover core functions
- Integration tests cover user flows
- Test coverage > 80% for new code

## 5. User Stories

### 5.1 Core User Stories

#### US-1: View Detailed Report
**As a** user who has completed onboarding  
**I want to** see my detailed report organized by sections  
**So that I can** easily find the information I'm interested in

**Acceptance Criteria**:
- User can see section tabs (personal, career, love)
- User can select a section to view its content
- User can see timeline filters (past, current, future)
- User can select a timeline to view specific content

#### US-2: Navigate Between Sections
**As a** user viewing a detailed report  
**I want to** switch between different life areas  
**So that I can** focus on the sections that matter most to me

**Acceptance Criteria**:
- Section tabs are clearly visible
- Active section is highlighted
- Content updates immediately when section changes
- No page reload is required

#### US-3: Filter by Timeline
**As a** user viewing a detailed report  
**I want to** filter content by time period  
**So that I can** understand how different areas of my life have evolved

**Acceptance Criteria**:
- Timeline filters are clearly labeled
- Active timeline is highlighted
- Content updates immediately when timeline changes
- All three time periods are available for each section

#### US-4: View Technical Data
**As a** user interested in technical details  
**I want to** toggle to see raw chart data  
**So that I can** understand the astronomical basis for my report

**Acceptance Criteria**:
- Toggle button is clearly labeled
- Technical view shows planets, houses, and angles
- Technical view does not interfere with narrative view
- Toggle is persistent during session

### 5.2 Edge Case User Stories

#### US-5: Handle Missing Report
**As a** user whose chart has no detailed report  
**I want to** see a friendly message instead of an error  
**So that I can** understand that the report is not available

**Acceptance Criteria**:
- System displays "Analysis not available" message
- System does not crash or show technical errors
- System provides option to generate a new report

#### US-6: Handle Slow Network
**As a** user with slow network connection  
**I want to** see loading indicators and progress  
**So that I can** understand that data is being retrieved

**Acceptance Criteria**:
- Loading indicator appears during data fetch
- System provides feedback on progress
- System handles timeouts gracefully

## 6. Data Model

### 6.1 Detailed Report Structure

```json
{
  "personal": {
    "past": "Narrative text about past personal experiences",
    "current": "Narrative text about current personal situation",
    "future": "Narrative text about future personal outlook"
  },
  "career": {
    "past": "Narrative text about past career experiences",
    "current": "Narrative text about current career situation",
    "future": "Narrative text about future career outlook"
  },
  "love": {
    "past": "Narrative text about past love experiences",
    "current": "Narrative text about current love situation",
    "future": "Narrative text about future love outlook"
  }
}
```

### 6.2 Fallback Structure

```json
{
  "personal": {
    "past": "Analysis not available.",
    "current": "Analysis not available.",
    "future": "Analysis not available."
  },
  "career": {
    "past": "Analysis not available.",
    "current": "Analysis not available.",
    "future": "Analysis not available."
  },
  "love": {
    "past": "Analysis not available.",
    "current": "Analysis not available.",
    "future": "Analysis not available."
  }
}
```

## 7. API Requirements

### 7.1 Existing Endpoints

#### GET /chart/{chart_id}
**Status**: No changes required  
**Description**: Returns complete chart data including detailed_report  
**Response**:
```json
{
  "chart_id": "uuid",
  "full_name": "string",
  "raw_astrology_data": { ... },
  "detailed_report": { ... },
  "message": "string"
}
```

### 7.2 Optional New Endpoints

#### GET /chart/{chart_id}/sections
**Status**: Optional enhancement  
**Description**: Returns only detailed report sections for lightweight updates  
**Response**:
```json
{
  "sections": {
    "personal": { ... },
    "career": { ... },
    "love": { ... }
  }
}
```

## 8. Constraints

### 8.1 Technical Constraints

- **Frontend Framework**: React with TypeScript
- **Animation Library**: Framer Motion
- **Backend Framework**: FastAPI
- **Database**: Supabase (PostgreSQL)
- **AI Service**: OpenRouter

### 8.2 Design Constraints

- **Aesthetic**: Maintain existing "Mystic Tech" design language
- **Color Scheme**: Use existing color palette (zinc-950, amber-400, etc.)
- **Typography**: Use existing font stack
- **Spacing**: Follow existing spacing system

### 8.3 Performance Constraints

- **Initial Load**: < 500ms
- **Section Switch**: < 100ms
- **Timeline Filter**: < 50ms
- **Bundle Size**: < 50KB additional

## 9. Assumptions

### 9.1 Backend Assumptions

- Backend stores `detailed_report` as JSONB in `birth_charts` table
- Backend returns complete chart data via existing endpoints
- Backend handles AI report generation via OpenRouter

### 9.2 Frontend Assumptions

- Frontend uses React with TypeScript
- Frontend uses Framer Motion for animations
- Frontend has existing chart display components
- Frontend has existing styling system

### 9.3 User Assumptions

- Users have modern web browsers
- Users have stable internet connection
- Users understand basic navigation patterns
- Users are interested in astrology content

## 10. Dependencies

### 10.1 External Dependencies

- **Supabase**: Database storage and retrieval
- **OpenRouter**: AI report generation
- **Framer Motion**: Animation library

### 10.2 Internal Dependencies

- **Backend API**: Chart computation and retrieval
- **Database Schema**: birth_charts table structure
- **Frontend Components**: Existing chart display components

## 11. Acceptance Criteria

### 11.1 Functional Acceptance Criteria

- [ ] User can view detailed report organized by sections
- [ ] User can switch between sections using tabs
- [ ] User can filter content by timeline (past, current, future)
- [ ] System handles missing data gracefully
- [ ] System handles malformed data gracefully
- [ ] System handles network errors gracefully
- [ ] Technical view toggle works correctly
- [ ] Animations are smooth and performant

### 11.2 Non-Functional Acceptance Criteria

- [ ] Initial render completes within 500ms
- [ ] Section switching completes within 100ms
- [ ] Timeline filtering completes within 50ms
- [ ] No XSS vulnerabilities detected
- [ ] No memory leaks during extended use
- [ ] Code follows project conventions
- [ ] Test coverage > 80% for new code

### 11.3 User Acceptance Criteria

- [ ] Users can easily find and navigate detailed report sections
- [ ] Users understand how to use timeline filters
- [ ] Users are not confused by error messages
- [ ] Users find the interface intuitive and responsive
- [ ] Users appreciate the visual design and animations

## Validated Requirements

### FR-1: Fetch Chart Data
**Validates**: User Story US-1, US-6

### FR-2: Parse Detailed Report
**Validates**: User Story US-1, US-5

### FR-3: Detect Available Sections
**Validates**: User Story US-2

### FR-4: Normalize Section Structure
**Validates**: User Story US-1, US-5

### FR-5: Display Section Tabs
**Validates**: User Story US-2

### FR-6: Display Timeline Filters
**Validates**: User Story US-3

### FR-7: Display Content
**Validates**: User Story US-1, US-3

### FR-8: Toggle Technical View
**Validates**: User Story US-4

### FR-9: Handle Missing Data
**Validates**: User Story US-5

### FR-10: Handle Malformed Data
**Validates**: User Story US-5

### FR-11: Handle Network Errors
**Validates**: User Story US-6

### FR-12: Load Time
**Validates**: User Story US-6

### FR-13: Memory Usage
**Validates**: NFR-6

### NFR-1: Intuitive Navigation
**Validates**: User Story US-1, US-2, US-3

### NFR-2: Responsive Design
**Validates**: User Story US-1, US-2, US-3

### NFR-3: Error Recovery
**Validates**: User Story US-5, US-6

### NFR-4: Data Consistency
**Validates**: User Story US-1, US-2, US-3

### NFR-5: Smooth Animations
**Validates**: User Story US-1, US-2, US-3

### NFR-6: Efficient Rendering
**Validates**: FR-12, FR-13

### NFR-7: XSS Protection
**Validates**: User Story US-1, US-2, US-3

### NFR-8: Secure Data Transmission
**Validates**: FR-1

### NFR-9: Code Quality
**Validates**: FR-1, FR-2, FR-3, FR-4

### NFR-10: Test Coverage
**Validates**: All functional requirements

## 12. Future Enhancements

### 12.1 Phase 2 Enhancements

- Section icons for visual identification
- Content summaries before full content
- Export detailed report as PDF
- Share specific sections on social media

### 12.2 Phase 3 Enhancements

- Interactive elements (expandable/collapsible sections)
- Related insights linking across sections
- Timeline visualization
- Personalized recommendations

### 12.3 Phase 4 Enhancements

- Multi-language support
- Audio playback of reports
- Bookmarking favorite sections
- Personal notes system