# Tauri Hello World - OpenAPI + Effect-TS

A modern Tauri desktop application demonstrating:
- **Rust backend** with automatic OpenAPI documentation using [utoipa](https://github.com/juhaku/utoipa)
- **Svelte 5 frontend** with strict TypeScript
- **Type-safe API client** using [openapi-typescript](https://openapi-ts.dev/) + [openapi-fetch](https://openapi-ts.dev/openapi-fetch/)
- **Functional error handling** with [Effect-TS](https://effect.website/)

## Project Structure

```
tauri-hello-world/
├── openapi/                    # OpenAPI specifications
│   └── api.yaml               # Main API spec (source of truth)
├── src/                        # Frontend source
│   ├── lib/
│   │   └── api/               # API client with Effect-TS
│   │       ├── client.ts      # Type-safe client wrapper
│   │       ├── client.test.ts # Client tests
│   │       ├── index.ts       # Module exports
│   │       └── schema.d.ts    # Generated types (from OpenAPI)
│   └── routes/
│       └── +page.svelte       # Main page component
├── src-tauri/                  # Rust backend
│   └── src/
│       ├── api/               # REST API implementation
│       │   ├── mod.rs         # Router & OpenAPI setup
│       │   ├── handlers.rs    # Request handlers
│       │   └── types.rs       # API types with utoipa
│       └── lib.rs             # Tauri app entry
└── package.json
```

## Features

### Backend (Rust)
- **Axum** web framework for REST API
- **utoipa** for automatic OpenAPI 3.1 documentation generation
- **Swagger UI** available at `/swagger-ui/`
- Type-safe request/response handling
- Comprehensive tests

### Frontend (TypeScript/Svelte)
- **Svelte 5** with runes for state management
- **Strict TypeScript** configuration
- **openapi-typescript** for type generation from OpenAPI spec
- **openapi-fetch** for type-safe HTTP requests
- **Effect-TS** for functional error handling
- Both REST API and Tauri IPC communication

## Getting Started

### Prerequisites
- Node.js 20+
- Rust 1.75+
- pnpm (or npm/yarn)

### Installation

```bash
# Navigate to project
cd tauri-hello-world

# Install frontend dependencies
pnpm install

# Generate API types from OpenAPI spec
pnpm generate:api
```

### Development

```bash
# Run the Tauri development server
pnpm tauri dev
```

This starts:
- Frontend dev server (Vite)
- Rust backend with API server on port 3030
- Tauri desktop window

### Access Points

| URL | Description |
|-----|-------------|
| `http://localhost:3030/api/health` | Health check endpoint |
| `http://localhost:3030/api/greet` | POST greeting endpoint |
| `http://localhost:3030/api/greet/{name}` | GET greeting endpoint |
| `http://localhost:3030/swagger-ui/` | Swagger UI documentation |
| `http://localhost:3030/api-docs/openapi.json` | OpenAPI JSON spec |

## API Documentation

The API is documented using OpenAPI 3.1. The spec is:
1. **Defined in Rust** using utoipa macros
2. **Auto-generated** at runtime
3. **Available** at `/api-docs/openapi.json`

### Endpoints

#### Health Check
```
GET /api/health
Response: { status: "healthy", timestamp: "...", version: "0.1.0" }
```

#### Greet (POST)
```
POST /api/greet
Body: { "name": "World" }
Response: { "message": "Hello, World! ...", "timestamp": "..." }
```

#### Greet (GET)
```
GET /api/greet/{name}
Response: { "message": "Hello, {name}! ...", "timestamp": "..." }
```

## Type Generation

### Generate Types from OpenAPI

```bash
# Generate TypeScript types from the OpenAPI spec
pnpm generate:api
```

This reads `openapi/api.yaml` and generates `src/lib/api/schema.d.ts`.

### Workflow

1. **Modify Rust types** in `src-tauri/src/api/types.rs`
2. **Update handlers** in `src-tauri/src/api/handlers.rs`
3. **Run the app** to generate the live OpenAPI spec
4. **Export spec** (optional): Save from `/api-docs/openapi.json`
5. **Regenerate types**: `pnpm generate:api`

## Effect-TS Integration

The API client uses Effect-TS for type-safe, composable error handling:

```typescript
import { effectApi, runEffect, matchApiError } from '$lib/api';
import { Either } from 'effect';

// Make API call
const result = await runEffect(effectApi.greet({ name: 'World' }));

// Handle result
if (Either.isRight(result)) {
  console.log(result.right.message);
} else {
  // Type-safe error handling
  const message = matchApiError(result.left, {
    onNetworkError: (e) => `Network failed: ${e.message}`,
    onApiRequestError: (e) => `API error: ${e.error.code}`,
    onUnexpectedError: (e) => `Unexpected: ${e.message}`,
  });
}
```

## Testing

### Frontend Tests
```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Backend Tests
```bash
cd src-tauri
cargo test
```

## Build for Production

```bash
# Build the application
pnpm tauri build
```

## Configuration

### TypeScript (tsconfig.json)
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- Full strict mode enabled

### Rust Dependencies
- `utoipa` v5 - OpenAPI generation
- `axum` v0.8 - Web framework
- `tokio` - Async runtime
- `serde` - Serialization

### Frontend Dependencies
- `effect` - Functional programming
- `openapi-fetch` - Type-safe fetch client
- `openapi-typescript` - Type generation

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).

## License

MIT
