# Rahat Triggers - Anticipatory Action Platform
A decentralized platform for managing anticipatory action projects to enhance community resilience against climate shocks.

## Table of Contents
- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Services](#services)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the App](#running-the-app)
- [Testing](#testing)
- [Development Guide](#development-guide)

## Project Overview
Rahat ("Relief" in Nepali) is a blockchain-based financial inclusion platform designed to empower vulnerable communities through anticipatory action (AA) projects. This trigger management system enables:

- 📆 Activity Management: Plan, organize, and track AA project activities
- 🚨 Trigger Modules: Configure hazard indicators and automated responses
- 🌍 Multi-source Forecasting: Integrate data from DHM, NCWRM, GLOFAS, etc.
- 💸 Cash/Voucher Assistance: Manage beneficiary support programs

## Key Features
- Microservices architecture with Redis-based communication
- Real-time trigger monitoring and response system
- Multi-agency forecasting data aggregation
- Blockchain-backed transaction transparency
- Automated workflow management
- Role-based access control

## Architecture
**Core Components:**
- **Redis Server**: Central message broker for inter-service communication
- **NestJS Microservices**: Independently deployable services
- **BullMQ**: Queue management for background jobs
- **Config Module**: Centralized environment configuration
- **Event Emitter**: Cross-service event management

## Services
| Service | Description |
|---------|-------------|
| Activity Management | Manages project timelines, tasks, and resource allocation |
| Trigger Engine | Processes hazard indicators and initiates predefined responses |
| Forecasting Integrator | Aggregates data from multiple meteorological sources |
| Communication Hub | Handles notifications and alerts distribution |
| Beneficiary Management | Maintains vulnerable community member records |

## Installation

### Prerequisites
- Node.js v20+
- Redis Server 6+
- pnpm 8+

```bash
# Clone repository
$ git clone https://github.com/rahataid/rahat-triggers.git

# Install dependencies
$ pnpm install

# Copy environment template
$ cp .env.example .env
```

## Configuration
Update `.env` file with your environment variables:

```ini
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
PROJECT_ID=your_project_uuid
```

## Running the App

### Development Mode
```bash
# Start in watch mode
$ pnpm dev
```

### Production Mode
```bash
# Build project
$ pnpm build

# Start production server
$ pnpm run start:prod
```

## Testing
```bash
# Unit tests
$ pnpm test

# E2E tests
$ pnpm test:e2e

# Coverage report
$ pnpm test:cov

```

## Development Guide

### Creating a New Service
1. Generate new NestJS service:
```bash
$ nest generate service new-service
```

## Contributing
We welcome contributions! Please follow these steps:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)


4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request
