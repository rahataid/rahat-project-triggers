# TypeScript Config Package

Shared TypeScript configurations for maintaining consistent compilation settings and type checking across all applications and packages in the monorepo. This package provides pre-configured TypeScript settings for different project types.

## Overview

The typescript-config package centralizes TypeScript compiler configurations to ensure consistent compilation behavior, type checking strictness, and output formats across the entire monorepo. It includes base configurations that can be extended by different project types.

## Features

- **Consistent Compilation**: Unified TypeScript settings across all packages
- **Multiple Configurations**: Different configs for different project types
- **Strict Type Checking**: Enforces strict TypeScript rules for better code quality
- **Modern JavaScript**: Targets modern JavaScript features and syntax
- **Path Mapping**: Supports module path mapping and aliases
- **Extensible**: Easy to extend and customize for specific project needs

## Package Structure

```
├── base.json     # Base TypeScript configuration
├── nestjs.json   # NestJS-specific configuration
└── package.json  # Package configuration
```

## Available Configurations

### Base Configuration

The base configuration provides fundamental TypeScript compiler options suitable for most projects.

**Usage:**

```json
{
  "extends": "@workspace/typescript-config/base.json"
}
```

**Key Features:**

- Strict type checking enabled
- Modern ES2020 target
- CommonJS module system
- Source map generation
- Declaration file generation
- Optimized for Node.js environments

### NestJS Configuration

Specialized configuration optimized for NestJS applications with framework-specific settings.

**Usage:**

```json
{
  "extends": "@workspace/typescript-config/nestjs.json"
}
```

**Key Features:**

- All base configuration options
- Experimental decorators enabled
- Emit decorator metadata
- Optimized for NestJS patterns
- Enhanced type checking for decorators

## Configuration Details

### Base Configuration Options

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "removeComments": true,
    "noEmitOnError": true,
    "resolveJsonModule": true
  }
}
```

### NestJS Configuration Additions

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "allowSyntheticDefaultImports": true,
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  }
}
```

## Usage in Projects

### NestJS Applications

For NestJS applications (like the triggers app):

```json
// tsconfig.json
{
  "extends": "@workspace/typescript-config/nestjs.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### TypeScript Packages

For TypeScript packages (like the database package):

```json
// tsconfig.json
{
  "extends": "@workspace/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*", "index.ts"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

### Build Configuration

For build-specific configurations:

```json
// tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

## Compiler Options Explained

### Type Checking Options

- **strict**: Enables all strict type checking options
- **noImplicitAny**: Disallows implicit any types
- **strictNullChecks**: Enables strict null checks
- **strictFunctionTypes**: Enables strict function type checking
- **noImplicitReturns**: Requires explicit return statements

### Module Resolution

- **moduleResolution**: Uses Node.js module resolution
- **esModuleInterop**: Enables interoperability between CommonJS and ES modules
- **allowSyntheticDefaultImports**: Allows default imports from modules without default exports
- **resolveJsonModule**: Allows importing JSON files

### Output Options

- **target**: Specifies ECMAScript target version
- **module**: Specifies module code generation
- **outDir**: Specifies output directory for compiled files
- **declaration**: Generates declaration files (.d.ts)
- **sourceMap**: Generates source map files

### Development Options

- **incremental**: Enables incremental compilation
- **tsBuildInfoFile**: Specifies build info file location
- **skipLibCheck**: Skips type checking of declaration files
- **noEmitOnError**: Prevents output generation on compilation errors

## Path Mapping

Configure path aliases for cleaner imports:

```json
{
  "extends": "@workspace/typescript-config/base.json",
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@lib/*": ["../packages/*/src"],
      "@utils/*": ["utils/*"]
    }
  }
}
```

## Project-Specific Customization

### Adding Custom Options

```json
{
  "extends": "@workspace/typescript-config/nestjs.json",
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"]
    },
    "types": ["node", "jest"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### Environment-Specific Configurations

```json
// tsconfig.production.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "sourceMap": false,
    "removeComments": true,
    "optimization": true
  }
}
```

## Build Scripts Integration

### Package.json Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "build:production": "tsc -p tsconfig.production.json",
    "type-check": "tsc --noEmit"
  }
}
```

### Turborepo Integration

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "type-check": {
      "dependsOn": ["^type-check"]
    }
  }
}
```

## IDE Integration

### VS Code

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

### TypeScript Version

Ensure consistent TypeScript version across the workspace:

```json
// .vscode/settings.json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.tsdk": "./node_modules/typescript/lib"
}
```

## Performance Optimization

### Incremental Compilation

```json
{
  "extends": "@workspace/typescript-config/base.json",
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  }
}
```

### Project References

For large monorepos, use project references:

```json
{
  "extends": "@workspace/typescript-config/base.json",
  "references": [{ "path": "../database" }, { "path": "../math" }]
}
```

## Best Practices

1. **Extend Base Configs**: Always extend from shared configurations
2. **Minimal Overrides**: Only override what's necessary for your project
3. **Consistent Paths**: Use consistent path mapping across projects
4. **Type Safety**: Enable strict mode for better type safety
5. **Build Optimization**: Use appropriate settings for development vs production

## Troubleshooting

### Common Issues

1. **Module Resolution Errors**: Check baseUrl and paths configuration
2. **Decorator Errors**: Ensure experimentalDecorators is enabled for NestJS
3. **Build Performance**: Use incremental compilation for large projects
4. **Import Errors**: Verify esModuleInterop settings

### Debug Configuration

```json
{
  "extends": "@workspace/typescript-config/base.json",
  "compilerOptions": {
    "listFiles": true,
    "traceResolution": true,
    "explainFiles": true
  }
}
```

## Migration Guide

### Updating Existing Projects

1. Install the typescript-config package
2. Update tsconfig.json to extend from shared config
3. Remove redundant compiler options
4. Test compilation and fix any issues
5. Update build scripts if necessary

### Breaking Changes

When updating shared configurations:

1. Document breaking changes
2. Provide migration instructions
3. Test across all projects
4. Consider gradual rollout

## Contributing

When contributing to TypeScript configurations:

1. Test changes across different project types
2. Ensure compatibility with existing projects
3. Document new options and their purpose
4. Consider performance implications
5. Update this documentation

## Maintenance

The TypeScript configurations should be regularly reviewed to:

- Update target ECMAScript version
- Incorporate new TypeScript features
- Optimize compilation performance
- Align with industry best practices
- Remove deprecated options

This package ensures consistent TypeScript compilation behavior across the entire monorepo while providing the flexibility to customize for specific project needs.
