# ESLint Config Package

Shared ESLint configurations for maintaining consistent code quality and style across all applications and packages in the monorepo. This package provides pre-configured ESLint rules for different project types.

## Overview

The eslint-config package centralizes linting rules and configurations to ensure consistent code quality, style, and best practices across the entire monorepo. It includes configurations for different environments including base JavaScript/TypeScript, NestJS applications, and Prettier integration.

## Features

- **Consistent Code Style**: Unified linting rules across all packages
- **Multiple Configurations**: Different configs for different project types
- **NestJS Support**: Specialized rules for NestJS applications
- **Prettier Integration**: Seamless integration with Prettier formatting
- **TypeScript Support**: Full support for TypeScript projects
- **Extensible**: Easy to extend and customize for specific needs

## Package Structure

```
├── base.js           # Base ESLint configuration
├── nestjs.js         # NestJS-specific configuration
├── prettier-base.js  # Prettier integration configuration
└── package.json      # Package configuration
```

## Available Configurations

### Base Configuration

The base configuration provides fundamental linting rules for JavaScript and TypeScript projects.

**Usage:**

```json
{
  "extends": ["@workspace/eslint-config/base"]
}
```

**Features:**

- Core ESLint rules
- TypeScript support
- Import/export rules
- Code quality checks
- Security best practices

### NestJS Configuration

Specialized configuration for NestJS applications with framework-specific rules.

**Usage:**

```json
{
  "extends": ["@workspace/eslint-config/nestjs"]
}
```

**Features:**

- All base configuration rules
- NestJS-specific patterns
- Decorator usage rules
- Dependency injection patterns
- API development best practices

### Prettier Integration

Configuration that integrates ESLint with Prettier for code formatting.

**Usage:**

```json
{
  "extends": [
    "@workspace/eslint-config/base",
    "@workspace/eslint-config/prettier-base"
  ]
}
```

**Features:**

- Disables conflicting ESLint rules
- Enables Prettier formatting
- Maintains code quality checks
- Seamless integration

## Usage in Projects

### NestJS Applications

For NestJS applications (like the triggers app):

```json
// .eslintrc.json or eslint.config.js
{
  "extends": [
    "@workspace/eslint-config/nestjs",
    "@workspace/eslint-config/prettier-base"
  ],
  "parserOptions": {
    "project": "./tsconfig.json"
  }
}
```

### TypeScript Packages

For TypeScript packages:

```json
// .eslintrc.json
{
  "extends": [
    "@workspace/eslint-config/base",
    "@workspace/eslint-config/prettier-base"
  ],
  "parserOptions": {
    "project": "./tsconfig.json"
  }
}
```

### JavaScript Projects

For pure JavaScript projects:

```json
// .eslintrc.json
{
  "extends": ["@workspace/eslint-config/base"]
}
```

## Configuration Details

### Base Rules Include

- **Code Quality**: Detect potential bugs and code smells
- **Best Practices**: Enforce JavaScript/TypeScript best practices
- **Import Rules**: Manage import/export statements
- **TypeScript Rules**: TypeScript-specific linting
- **Security Rules**: Basic security checks

### NestJS Rules Include

- **Decorator Usage**: Proper use of NestJS decorators
- **Dependency Injection**: DI pattern enforcement
- **Module Structure**: NestJS module organization
- **API Patterns**: REST API best practices
- **Exception Handling**: Error handling patterns

### Prettier Rules Include

- **Formatting Conflicts**: Disable ESLint rules that conflict with Prettier
- **Code Style**: Let Prettier handle code formatting
- **Integration**: Seamless ESLint + Prettier workflow

## Customization

### Project-Specific Rules

You can extend the shared configurations with project-specific rules:

```json
{
  "extends": ["@workspace/eslint-config/nestjs"],
  "rules": {
    "your-custom-rule": "error",
    "@typescript-eslint/no-unused-vars": "warn"
  }
}
```

### Environment-Specific Overrides

```json
{
  "extends": ["@workspace/eslint-config/base"],
  "overrides": [
    {
      "files": ["**/*.test.ts"],
      "rules": {
        "no-unused-expressions": "off"
      }
    }
  ]
}
```

## Scripts Integration

### Package.json Scripts

Add linting scripts to your package.json:

```json
{
  "scripts": {
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\"",
    "lint:fix": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\""
  }
}
```

### Pre-commit Hooks

Integrate with husky for pre-commit linting:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,js}": ["eslint --fix", "prettier --write"]
  }
}
```

## IDE Integration

### VS Code

Create `.vscode/settings.json`:

```json
{
  "eslint.validate": ["javascript", "typescript"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### Other IDEs

Most modern IDEs support ESLint integration. Configure your IDE to:

- Use the project's ESLint configuration
- Enable auto-fix on save
- Show linting errors inline

## Dependencies

### Peer Dependencies

The configurations expect these to be installed in your project:

- **eslint**: Core ESLint package
- **@typescript-eslint/parser**: TypeScript parser
- **@typescript-eslint/eslint-plugin**: TypeScript rules
- **prettier**: Code formatter
- **eslint-config-prettier**: Prettier integration

### Installation

These dependencies are typically installed at the workspace root:

```bash
pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier
```

## Best Practices

1. **Consistent Usage**: Use the same configuration across similar projects
2. **Regular Updates**: Keep ESLint rules updated with best practices
3. **Team Agreement**: Ensure team agrees on rule strictness
4. **Gradual Migration**: Introduce new rules gradually in existing projects
5. **Documentation**: Document any project-specific rule overrides

## Troubleshooting

### Common Issues

1. **Parser Errors**: Ensure TypeScript parser is configured correctly
2. **Rule Conflicts**: Check for conflicts between ESLint and Prettier
3. **Performance**: Large projects may need ESLint caching enabled
4. **IDE Issues**: Restart IDE after configuration changes

### Performance Optimization

```json
{
  "extends": ["@workspace/eslint-config/base"],
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "settings": {
    "import/cache": {
      "lifetime": "Infinity"
    }
  }
}
```

## Contributing

When contributing to the ESLint configurations:

1. Test changes across different project types
2. Ensure compatibility with existing projects
3. Document new rules and their rationale
4. Consider backward compatibility
5. Update this documentation

## Maintenance

The ESLint configurations should be regularly reviewed and updated to:

- Incorporate new ESLint rules
- Update TypeScript rules for new language features
- Align with industry best practices
- Remove deprecated rules
- Optimize performance

This package ensures consistent code quality and style across the entire monorepo while remaining flexible enough to accommodate different project needs.
