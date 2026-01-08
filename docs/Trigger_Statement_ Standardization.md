# Trigger Statement Standardization - Business Overview

## Introduction

The Rahat Triggers system monitors multiple external data sources (DHM, GLOFAS, GFH) to automatically detect when specific conditions are met and activate triggers. This document explains how the system standardizes data from different sources and evaluates trigger conditions in simple, non-technical terms.

## The Challenge: Different Data Sources, Different Formats

Imagine you're monitoring flood conditions and need to check water levels from three different organizations:

- **DHM (Department of Hydrology and Meteorology)**: Provides water level data in meters and rainfall data in millimeters
- **GLOFAS (Global Flood Awareness System)**: Provides flood probability forecasts as percentages
- **GFH (Google Flood Hub)**: Provides discharge data in cubic meters per second

Each organization formats their data differently, uses different units, and structures information in unique ways. To create a unified system that can automatically evaluate triggers across all these sources, we need to convert everything into a common, standardized format.

## Part 1: Data Standardization Process

### The Three-Step Transformation

Every data source goes through a three-step process to convert raw data into a standardized format:

#### Step 1: Fetch (Collecting Raw Data)

The system connects to each external data source and retrieves the raw information. This is like visiting each organization's website and downloading their latest reports. The data comes in various formats - some as web pages, some as structured data files, each with their own unique structure.

#### Step 2: Aggregate (Organizing the Data)

Once raw data is collected, the system extracts and organizes the meaningful information. It identifies key measurements like water levels, rainfall amounts, or flood probabilities, and structures them in a consistent way. This step is like translating different languages into a common format while preserving all the important details.

#### Step 3: Transform (Creating Standard Indicators)

In the final step, all data is converted into a standardized format called an "Indicator." Every Indicator contains the same type of information, regardless of its original source:

- **What type of measurement it is** (water level, rainfall, flood probability, etc.)
- **The actual value** (the number representing the measurement)
- **The units** (meters, millimeters, percentage, etc.)
- **Where it was measured** (station ID, river basin, or geographic coordinates)
- **When it was measured** (timestamp)
- **Which source it came from** (DHM, GLOFAS, or GFH)

This standardization means that whether you're looking at DHM water levels or GLOFAS flood probabilities, the system treats them the same way - as Indicators that can be compared and evaluated.

### Example: Standardization in Action

**Original DHM Data:**

- Station ID: 12345
- Water Level: 5.2 meters
- Location: Bagmati River Basin
- Timestamp: 2024-01-15 10:30 AM

**After Standardization (Indicator):**

- Indicator Type: `water_level_m`
- Value: 5.2
- Units: `m`
- Location: { type: "BASIN", basinId: "Bagmati", seriesId: 12345 }
- Issued At: "2024-01-15T10:30:00Z"
- Source: { key: "DHM" }

This standardized format allows the system to work with data from any source using the same evaluation logic.

## Part 2: Creating Trigger Statements

### What is a Trigger Statement?

A trigger statement is a rule that defines when a trigger should be activated. Think of it as a condition that says: "If this specific measurement reaches a certain threshold, then activate the trigger."

### Components of a Trigger Statement

When creating a trigger, you need to specify:

1. **Data Source Type**: Which type of measurement you're monitoring
   - Water Level (in meters)
   - Rainfall (in millimeters)
   - Flood Probability (as percentage)
   - Discharge (in cubic meters per second)

2. **Source Subtype**: The specific metric within that data type
   - For Water Level: `warning_level` or `danger_level`
   - For Rainfall: `hourly` or `daily`
   - For Flood Probability: `two_years_return_period`, `five_years_return_period`, or `twenty_years_return_period`
   - For Discharge: `warning_discharge` or `danger_discharge`

3. **Comparison Operator**: How to compare the value
   - Greater than (>)
   - Less than (<)
   - Equal to (=)
   - Greater than or equal to (>=)
   - Less than or equal to (<=)

4. **Threshold Value**: The number that must be reached
   - Example: 5.5 meters for water level
   - Example: 50 millimeters for rainfall
   - Example: 75% for flood probability

5. **Expression**: A mathematical formula that combines the above elements
   - Example: `warning_level >= 5.5`
   - Example: `hourly > 50`
   - Example: `two_years_return_period >= 75`

6. **Station ID** (Optional): If the trigger is specific to a particular monitoring station

### Example Trigger Statement

**Scenario**: You want to activate a trigger when the water level at a specific station reaches or exceeds the warning level of 5.5 meters.

**Trigger Statement Components:**

- Source: `water_level_m`
- Source Subtype: `warning_level`
- Operator: `>=`
- Value: `5.5`
- Expression: `warning_level >= 5.5`
- Station ID: `12345`

This trigger statement is stored in the system and will be automatically evaluated whenever new water level data arrives.

## Part 3: Automatic Trigger Evaluation

### How the System Evaluates Triggers

Once data is standardized and trigger statements are created, the system automatically evaluates triggers whenever new data arrives. Here's how it works:

#### Step 1: Data Arrival and Notification

When new standardized data (Indicators) arrives from any data source, the system immediately notifies the trigger evaluation system. This happens automatically on a regular schedule (typically every 15 minutes) or when new data is detected.

#### Step 2: Finding Relevant Triggers

The system searches for all active triggers that match:

- The same data source (DHM, GLOFAS, or GFH)
- The same indicator type (water level, rainfall, etc.)

For example, if new water level data arrives from DHM, the system finds all triggers monitoring DHM water levels.

#### Step 3: Grouping by Location

The system organizes matching triggers by location (station ID or river basin). This ensures that triggers are only evaluated against data from their specific monitoring location. A trigger for Station 12345 will only be checked against data from Station 12345, not from other stations.

#### Step 4: Expression Evaluation

For each trigger, the system:

1. Takes the new data value (e.g., water level is now 5.8 meters)
2. Substitutes it into the trigger's expression (e.g., `warning_level >= 5.5`)
3. Evaluates whether the condition is true or false
4. If true, the threshold has been met

**Example Evaluation:**

- New Data: Water level = 5.8 meters
- Trigger Expression: `warning_level >= 5.5`
- Evaluation: `5.8 >= 5.5` = **TRUE**
- Result: **Threshold met - trigger should be activated**

#### Step 5: Trigger Activation

When a trigger's threshold is met:

1. The trigger is marked as "activated" in the system
2. The activation is recorded with a timestamp
3. The system updates the related phase to track how many triggers have been activated
4. A notification is sent to inform relevant stakeholders
5. The trigger is added to a processing queue for any follow-up actions

### Special Handling for Different Data Sources

#### DHM Water Level and Rainfall

- Triggers are matched by Station ID
- Each station's data is evaluated against triggers specific to that station
- Multiple triggers can be activated simultaneously if they all meet their thresholds

#### GLOFAS Flood Probability

- GLOFAS provides three different probability values in a single data point (2-year, 5-year, and 20-year return period)
- The system splits this into three separate values
- Each value is evaluated against triggers monitoring that specific probability type
- Example: If the data contains "60/75/85", the system evaluates:
  - 2-year return period (60%) against `two_years_return_period` triggers
  - 5-year return period (75%) against `five_years_return_period` triggers
  - 20-year return period (85%) against `twenty_years_return_period` triggers

#### GFH Discharge

- The system calculates the average value across all indicators for a location
- This average is then evaluated against triggers
- This approach ensures that triggers consider overall conditions rather than individual data points

## Complete Workflow: From Data Source to Trigger Activation

### 1. Data Collection (Every 15 Minutes)

- The system automatically connects to external data sources (DHM, GLOFAS, GFH)
- Raw data is collected from each source

### 2. Standardization

- Raw data goes through the three-step process (Fetch → Aggregate → Transform)
- All data is converted into standardized Indicators
- Each Indicator has a consistent format regardless of its source

### 3. Event Notification

- When new Indicators are created, the system broadcasts an event
- This event contains all the new standardized data
- The trigger evaluation system listens for these events

### 4. Trigger Matching

- The system finds all active triggers that match the data source and indicator type
- Triggers are grouped by location to ensure accurate matching

### 5. Evaluation

- Each matching trigger's expression is evaluated against the new data value
- The system determines if thresholds have been met

### 6. Activation

- Triggers that meet their thresholds are automatically activated
- The system records the activation, updates phase tracking, and sends notifications
- Follow-up actions are queued for processing

## Benefits of Standardization

### Consistency

All data sources are treated uniformly, making it easy to create triggers that work across different sources without special handling.

### Flexibility

New data sources can be added by creating adapters that convert their data into the standard Indicator format. The rest of the system doesn't need to change.

### Accuracy

By standardizing data and using mathematical expressions, the system ensures that trigger evaluations are precise and consistent.

### Automation

Once triggers are created, the system automatically monitors data and activates triggers when conditions are met, without requiring manual intervention.

### Scalability

The system can handle multiple data sources, thousands of triggers, and continuous monitoring without performance issues.

## Summary

The trigger statement standardization system solves the challenge of monitoring multiple data sources with different formats by:

1. **Standardizing** all incoming data into a common Indicator format through a three-step transformation process
2. **Storing** trigger statements that define conditions using standardized components (source type, subtype, operator, value, expression)
3. **Automatically evaluating** triggers whenever new standardized data arrives
4. **Activating** triggers when their conditions are met, with full tracking and notification

This approach ensures that regardless of where data comes from or how it's originally formatted, the system can reliably monitor conditions and activate triggers when thresholds are reached.
