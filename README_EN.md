# PostEasy

> Cross-platform desktop app — scan Java Spring Controller source code and generate interactive offline HTML API documentation with one click.

[中文](README.md)

---

## 📑 Table of Contents

- [Features](#features)
- [Installation & Usage](#installation--usage)
- [HTML Offline Documentation](#html-offline-documentation)
- [How Descriptions Are Resolved](#how-descriptions-are-resolved)
  - [API Tree Controller Name](#api-tree-controller-name)
  - [API Description (Method Summary)](#api-description-method-summary)
  - [Request Parameter Description](#request-parameter-description)
  - [Response / Request Body Field Description](#response--request-body-field-description)
  - [Edit Priority](#edit-priority)
  - [Field Tree Recursion](#field-tree-recursion)
- [Notes & Caveats](#notes--caveats)
- [Development](#development)

---

## Features

### Desktop App (Electron)

- **📁 Project Scanning** — Select a Java project root; automatically discovers multi-module Maven/Gradle structures and locates all `*Controller.java` files
- **🔍 AST Parsing** — Source-level AST analysis via tree-sitter-java. **No JDK required** — works out of the box
- **📊 Scan Overview** — Displays controller count, total API count, and parsing issues; supports exporting error logs
- **📄 Document Export** — One-click generation of a self-contained HTML API document that opens directly in a browser with no local server needed

### HTML Offline Documentation (Generated)

- **🌐 Live Request Debugging** — Built-in HTTP client supporting GET / POST / PUT / DELETE / PATCH; call APIs directly from the document
- **📝 Editable Descriptions** — API summaries, request parameter descriptions, and response field descriptions are all **click-to-edit**; edits are auto-persisted to localStorage
- **💾 Export with Descriptions** — Embed your edited descriptions into the HTML file and export it as a new standalone document to share with your team
- **📋 Custom Headers** — Add arbitrary request headers (e.g., Authorization, X-Token) for request debugging
- **🔢 Environment Switching** — Built-in "Local Dev / Test / Production" environments with customizable names and Base URLs
- **📂 Request History** — Auto-saves the last 50 requests including parameters, headers, and response status; one-click restore
- **🔎 Quick Search** — Filter APIs by path or method name; `Ctrl+K` shortcut to focus the search box
- **🎨 Theme Switching** — Light / Dark / System three theme modes
- **🌍 Bilingual UI** — Toggle between Chinese and English with one click
- **🔄 Body View Toggle** — Switch between JSON editor and form field views with bidirectional sync
- **🪄 Fill Example Values** — One-click auto-fill of example values for request body fields (type-aware)
- **📎 cURL Export** — Every request auto-generates a cURL command; one-click copy

### Parsing Support

| Category | Supported |
|----------|-----------|
| Java Versions | 8 / 11 / 17 / 21+ |
| Spring Boot | 2.x / 3.x / 4.x+ |
| Annotation Namespaces | `javax.*` and `jakarta.*` auto-adapted |
| HTTP Annotations | `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`, `@PatchMapping`, `@RequestMapping` |
| Parameter Annotations | `@RequestParam`, `@PathVariable`, `@RequestBody`, `@RequestHeader`, `@RequestPart`, `@CookieValue`, etc. |
| Validation Constraints | `@NotNull`, `@NotBlank`, `@NotEmpty`, `@Size`, `@Min`, `@Max`, `@Pattern`, and 15+ more |
| Swagger Annotations | `@Operation`, `@ApiOperation`, `@Tag`, `@Api`, `@Schema`, `@ApiModelProperty`, `@Parameter`, `@ApiParam` |
| Response Types | POJOs, `R`/`Result`/`ResponseEntity` wrappers, `Mono`/`Flux` reactive, `List`/`Page` pagination, file downloads |
| DTO Resolution | Automatically resolves fields from all `.java` files; supports nested object expansion (max depth 5); circular references auto-detected |

---

## Installation & Usage

### Download

Download the installer for your platform from [GitHub Releases](https://github.com/tangjindi/PostEasy/releases):

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `PostEasy-1.0.0-mac-arm64.dmg` |
| macOS (Intel) | `PostEasy-1.0.0-mac-x64.dmg` |
| Windows | `PostEasy-Setup-1.0.0-win.exe` |

> **Windows users**: If SmartScreen blocks the installer, click "More info" → "Run anyway". This is because the app is not code-signed.

### Basic Workflow

1. **Launch** — Open PostEasy
2. **Select Project** — Choose the root directory of your Java Spring Boot project (the directory containing `pom.xml` or `build.gradle`)
3. **Scan** — Click "Start Scan"; the app will discover all Controller files and parse the APIs
4. **Export** — After scanning, click "Export HTML" and choose a save location
5. **Open** — Open the generated HTML file in a browser to view and interact

### Multi-Module Projects

PostEasy automatically detects Maven/Gradle multi-module structures and scans all `src/main/java` directories. To scan only a specific path, enter a sub-path in the "API Path" input field.

---

## HTML Offline Documentation

The generated HTML document is a **fully self-contained** single-file application — no web server or local service required.

### Left Sidebar
- **Search Box** — Quick-filter APIs by path or method name; `Ctrl+K` to focus
- **Environment Selector** — Switch Base URL between environments; add custom environments
- **API Tree** — APIs grouped by Controller; expand/collapse all; search filtering
- **Bottom Buttons** — Theme toggle, language toggle, history panel, export with descriptions

### Right Detail Panel
- **API Description** — Shows the method summary; **click to edit**
- **Request Parameters Table** — Name, location, type, required, description, value. Simple params use inline inputs; complex objects (`@RequestBody`) render as editable field trees. **Field descriptions are click-to-edit**
- **Request Body** — Toggle between **Form** and **JSON** views; bidirectional sync
- **Custom Headers** — Dynamically add/remove arbitrary headers (e.g., `Authorization: Bearer xxx`)
- **Response Parameters** — Response field tree with **editable field descriptions**; nested objects expand/collapse
- **Send Request** — Fill in parameters and click Send; displays request details, response headers, response body, timing, and status code; auto-generates cURL

### Export with Descriptions

This is PostEasy's signature feature:

1. Edit API descriptions, parameter descriptions, and field descriptions in the HTML document
2. Click the **💾 Export (with desc)** button at the bottom-left
3. Your edits are embedded into a new HTML file
4. Share the new file with your team — they'll see all your supplemental descriptions immediately

> **How it works**: The export function serializes `state.edits` into an embedded `<script>` tag and injects it into the HTML. On page load, the embedded edits are automatically merged into the document.

---

## How Descriptions Are Resolved

PostEasy extracts "Description" fields from Java source code with the following priority:

### API Tree Controller Name

In the left sidebar API tree, the Controller group name is resolved from annotations with the following priority:

| Priority | Source | Example |
|----------|--------|---------|
| 1 (highest) | `@Tag(name = "...")` | `@Tag(name = "User Management")` → displays "User Management" |
| 2 | `@Api("...")` | `@Api("User Management")` → displays "User Management" (value shorthand) |
| 3 | `@Api(tags = "...")` | `@Api(tags = "User Management")` → displays "User Management" |
| 4 | `@Api(value = "...")` | `@Api(value = "User Management")` → displays "User Management" |
| 5 | Javadoc first line | First line of `/** User Management Controller */` |
| 6 (lowest) | Java class name | e.g., `UserController` (fallback) |

> **Note**: `@Tag` is a Swagger v3 / OpenAPI 3 annotation; `@Api` is a Swagger v2 / SpringFox annotation. Both annotation namespaces (`javax.*` / `jakarta.*`) are supported.

### API Description (Method Summary)

| Priority | Source | Example |
|----------|--------|---------|
| 1 (highest) | `@Operation(summary = "...")` | Swagger v3 / SpringDoc |
| 2 | `@ApiOperation(value = "...")` | Swagger v2 / SpringFox |
| 3 | Javadoc first line | First line of `/** Get user info */` |
| 4 (lowest) | Empty | Shows "No description" |

### Request Parameter Description

| Priority | Source | Example |
|----------|--------|---------|
| 1 | `@Parameter(description = "...")` | Swagger v3 |
| 2 | `@ApiParam(value = "...")` | Swagger v2 |
| 3 | Empty | Manually fill in the document |

### Response / Request Body Field Description

| Priority | Source | Example |
|----------|--------|---------|
| 1 | `@Schema(description = "...")` | Swagger v3 |
| 2 | `@ApiModelProperty(value = "...")` | Swagger v2 |
| 3 | Empty | Manually fill in the document |

### Edit Priority

User-edited descriptions in the HTML document take **highest priority** and override all default values from source code.

### Field Tree Recursion

For nested DTO objects, PostEasy auto-expands the field tree up to a maximum depth of **5 levels**. Fields beyond this depth are marked as "Truncated". Circular references (e.g., A contains B, B contains A) are marked as "Circular Ref".

---

## Notes & Caveats

### Java Project Requirements

- The project must be a **Maven** or **Gradle** Spring Boot project
- Controller files must end with `Controller.java` (e.g., `UserController.java`)
- `*ControllerImpl.java`, `*ControllerTest.java`, and `Abstract*.java` are auto-excluded
- The project does NOT need to compile — PostEasy only performs source-level syntax parsing

### HTTP Request Limitations

- The HTML document uses the browser's `fetch` API for requests, subject to **same-origin policy**
- If CORS is not configured on the backend, requests will be blocked with a network error
- **Fix**: Add `@CrossOrigin(origins = "*")` to your Controller or configure a global CORS filter
- If the URL is **also unreachable directly in a browser**, check that your Base URL is correct and the server is running

### Data Storage

- Edited descriptions, parameter values, and request history are stored in the browser's **localStorage**
- Different project documents use separate storage keys (based on project name hash) and do not interfere with each other
- Clearing browser data will cause loss of edits — use **Export with Descriptions** to save your work
- Exported-with-descriptions HTML files are **fully standalone** with all edit data embedded; they do not depend on localStorage

### Windows Users

- The installer is unsigned and may trigger SmartScreen warnings
- If you encounter garbled Chinese characters, ensure your Java files use **UTF-8** encoding
- Windows builds must be performed on a Windows system (tree-sitter native modules do not support macOS→Windows cross-compilation)

### Known Limitations

- JSP / Thymeleaf template endpoints are not supported
- Non-Spring Boot frameworks (JAX-RS, Play Framework, etc.) are not supported
- Kotlin Controllers are not supported (only `.java` files are parsed)
- File download response types (`ResponseEntity<Resource>`, etc.) are marked as "File Download" without field expansion
- HTTP request debugging supports JSON and form-encoded formats only; multipart file upload debugging is not supported

---

## Development

### Prerequisites

- Node.js >= 20 LTS
- npm >= 10

### Setup

```bash
npm install
npm run dev
```

### Build

```bash
npm run build          # Build code only
npm run build:mac      # Build macOS DMG
npm run build:win      # Build Windows NSIS installer (must run on Windows)
```

### Testing

```bash
npm run test           # Unit tests (Vitest)
npm run test:e2e       # E2E tests (Playwright)
npm run typecheck      # TypeScript type checking
npm run lint           # ESLint
```

### Project Structure

```
post-easy/
├── electron/              # Electron main process
│   ├── main.ts            # Window management + IPC handlers
│   ├── preload.ts         # contextBridge secure API
│   └── ipc/
│       ├── scanner.ts     # Java file scanning (multi-module, config parsing)
│       ├── parser.ts      # tree-sitter AST parsing (annotations/params/responses)
│       ├── generator.ts   # Handlebars template → HTML document
│       └── __tests__/     # Unit tests
├── src/                   # React renderer process
│   ├── pages/             # HomePage / ScanPage / ExportPage
│   ├── components/        # Shared UI components
│   ├── stores/            # Zustand state management
│   └── styles/            # Tailwind CSS
├── templates/
│   └── api-doc.hbs        # HTML doc template (full JS SPA logic)
├── test/fixtures/         # Test Java source files
├── resources/             # App icons
├── electron-builder.yml   # Build configuration
└── package.json
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop Framework | Electron |
| Frontend | React 18 + Vite + Tailwind CSS |
| Java Parsing | tree-sitter-java (zero JDK dependency) |
| Template Engine | Handlebars |
| State Management | Zustand |
| Packaging | electron-builder |
| Testing | Vitest + Playwright |

---

## License

MIT
