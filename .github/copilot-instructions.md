# EZ Tax Form - Angular Application Guide

## Project Overview

EZ Tax Form is an Angular application for managing Thai tax documents and invoices, with multilingual support (Thai/English). The application handles document generation, management, and form submissions with a focus on Thai tax compliance.

## Core Architecture

### Authentication Flow

- JWT-based authentication with cross-tab synchronization
- `AuthService` (`src/app/shared/auth.service.ts`) manages authentication state
- Role-based access control (RBAC): HQ_ADMIN, BRANCH_ADMIN, STAFF, SYSTEM_ADMIN
- Token management via localStorage with broadcast channel for logout sync

### Service Layer Design

Key services in `src/app/shared/`:

- `AuthService`: Centralized auth with token management
- `LoadingService`: Global loading state with HTTP interceptor
- `ThaiAddressService`: Thai address data management with ZIP lookup
- `DocumentService`: Document CRUD operations
- `DocumentTypeService`: Document template management

### Thai Address Integration

- Hierarchical data structure: Province → District → Subdistrict
- ZIP code-based lookup in `ThaiAddressService`
- Thai/English localization support
- Local JSON data source in `src/assets/thai/`

## Key Development Patterns

### Form Handling

```typescript
// Example from invoice-form.component.ts
export class InvoiceFormComponent {
  form!: FormGroup;
  fgHeader!: FormGroup;
  fgCustomer!: FormGroup;

  // Nested form structure for complex documents
  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      header: this.fgHeader,
      customer: this.fgCustomer,
      // ...
    });
  }
}
```

### State Management

- Service-based state with RxJS observables
- Loading state via interceptor pattern
- Authentication state with cross-tab sync

### HTTP Interceptors

Located in `src/app/shared/`:

- `jwt.interceptor.ts`: Adds auth tokens
- `loading.interceptor.ts`: Manages loading state
- `auth.interceptor.ts`: Handles auth errors

## Development Workflow

### Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run development server:

```bash
ng serve --proxy-config proxy.conf.json
```

### Key Commands

- `npm start`: Runs dev server with proxy config
- `npm run build`: Production build
- `npm test`: Run unit tests

### Project Structure Conventions

- Feature modules in `src/app/features/`
- Shared services in `src/app/shared/`
- Components follow Angular Material patterns
- Thai localization files in `src/assets/thai/`

## Common Tasks

### Adding New Document Types

1. Update `DocumentTypeService` configuration
2. Create template in `NewDocumentDialogComponent`
3. Add validation rules to form component
4. Update document listing components

### Authentication Implementation

```typescript
// Example auth guard usage
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(["/login"]);
      return false;
    }
    return true;
  }
}
```

## Integration Points

### External Services

- Backend API base URL configured in `environment.ts`
- Thai address data from local JSON files
- Document templates from backend API

### Error Handling

- HTTP interceptors for global error catching
- Loading state management via service
- Form validation with user feedback in Thai/English

## Best Practices

1. Use `ThaiAddressService` for all address handling
2. Implement proper error handling in HTTP calls
3. Follow Angular Material design patterns
4. Use TypeScript interfaces for API responses
5. Maintain bilingual support in user interfaces
