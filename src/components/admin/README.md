# AI Quiz Generation Admin Interface

This directory contains the admin interface components for AI-powered quiz generation.

## Components

### GenerateAIQuizButton.tsx
Main component that provides the AI quiz generation interface in the Quizzes collection admin panel.

**Features:**
- Configuration modal with form validation
- Real-time progress tracking during generation
- Category selection from existing categories
- Student level targeting (PASS/LAS/both)
- Difficulty and question count configuration
- Custom instructions support
- Error handling and retry functionality

**Usage:**
The component is automatically added to the Quizzes collection admin interface as a UI field in the sidebar.

### QuizPreview.tsx
Preview component that displays generated quizzes before publication.

**Features:**
- Question-by-question navigation
- Visual indication of correct answers
- Explanation display
- Quiz metadata (duration, passing score, etc.)
- Publish and edit actions
- Responsive design

**Usage:**
Automatically displayed after successful quiz generation, allowing administrators to review and publish the generated content.

## Integration

The components are integrated into the Payload CMS admin interface through:

1. **Collection Configuration**: Added as a UI field in the Quizzes collection
2. **API Endpoint**: Connected to `/api/quizzes/generate-ai` endpoint
3. **Real-time Updates**: Progress tracking during generation process
4. **Error Handling**: Comprehensive error states and recovery options

## Configuration Requirements

For the AI generation to work properly, ensure:

1. **Categories**: At least one category exists in the system
2. **AI Service**: GEMINI_API_KEY is configured in environment variables
3. **Permissions**: User has admin or superadmin role
4. **Database**: Questions collection allows optional course field

## Validation

The interface includes comprehensive validation:

- Subject length (10-200 characters)
- Category selection (required)
- Question count (5-20 questions)
- Student level selection
- Admin permissions check

## Error Handling

The components handle various error scenarios:

- API unavailability
- Invalid AI responses
- Database errors
- Validation failures
- Rate limiting

Each error provides specific feedback to help administrators understand and resolve issues.