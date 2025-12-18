import { DataSource } from '@lib/database';
import { z } from 'zod';

const SOURCE_CONFIG = {
  water_level_m: {
    label: 'DHM Water Level',
    sourceSubType: 'Water Level (m)',
    subTypes: ['warning_level', 'danger_level'],
  },
  discharge_m3s: {
    label: 'GFH',
    sourceSubType: 'Discharge (m³/s)',
    subTypes: ['warning_discharge', 'danger_discharge'],
  },
  rainfall_mm: {
    label: 'DHM Rainfall',
    sourceSubType: 'Rainfall (mm)',
    subTypes: ['hourly', 'daily'],
  },
  prob_flood: {
    label: 'Glofas',
    sourceSubType: 'Flood Probability',
    subTypes: ['2_years_max_prob', '5_years_max_prob', '20_years_max_prob'],
  },
} as const;

const sourceValues = Object.keys(SOURCE_CONFIG) as [
  keyof typeof SOURCE_CONFIG,
  ...Array<keyof typeof SOURCE_CONFIG>,
];

const operatorValues = ['>', '<', '=', '>=', '<='] as const;

const numericValueSchema = z.coerce.number().finite();

const triggerStatementSchemaBase = z.object({
  source: z.enum(sourceValues),
  sourceSubType: z.string().min(1, 'sourceSubType is required'),
  operator: z.enum(operatorValues),
  value: numericValueSchema,
  stationId: z.string().optional(),
  stationName: z.string().optional(),
  expression: z
    .string()
    .trim()
    .min(3, 'expression must contain an operator and value'),
});

const triggerStatementSchema = triggerStatementSchemaBase.superRefine(
  (value, ctx) => {
    const config = SOURCE_CONFIG[value.source];
    if (
      config &&
      !(config.subTypes as readonly string[]).includes(value.sourceSubType)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `sourceSubType must be one of [${config.subTypes.join(', ')}] for ${value.source}`,
        path: ['sourceSubType'],
      });
    }

    if (!value.expression.includes(value.operator)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'expression must include the selected operator',
        path: ['expression'],
      });
    }

    if (!value.expression.includes(value.sourceSubType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'expression must reference the selected sourceSubType',
        path: ['expression'],
      });
    }
  },
);

const triggerStatementInputSchema = z
  .union([z.string(), triggerStatementSchema])
  .transform((value, ctx) => {
    const candidate =
      typeof value === 'string'
        ? (() => {
            try {
              return JSON.parse(value);
            } catch (error) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'triggerStatement must be valid JSON',
              });
              return z.NEVER;
            }
          })()
        : value;

    if (candidate === z.NEVER) {
      return z.NEVER;
    }

    const parsed = triggerStatementSchema.safeParse(candidate);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => ctx.addIssue(issue));
      return z.NEVER;
    }

    return parsed.data;
  });

export const triggerPayloadSchema = z.object({
  repeatKey: z.string().optional(),
  repeatEvery: z.string().optional(),
  triggerStatement: triggerStatementInputSchema,
  triggerDocuments: z
    .union([z.record(z.any()), z.null(), z.undefined()])
    .optional()
    .transform((val) => (val === null ? undefined : val)),
  notes: z.string().trim().max(500).optional().default(''),
  title: z.string().trim().min(3).max(120),
  description: z.string().optional(),
  isMandatory: z.boolean().optional().default(false),
  isTriggered: z.boolean().optional().default(false),
  isDeleted: z.boolean().optional().default(false),
  phaseId: z.string().trim().min(1, 'phaseId is required'),
  riverBasin: z.string().trim().min(1, 'riverBasin is required').optional(),
  source: z.nativeEnum(DataSource),
});

export type TriggerPayload = z.infer<typeof triggerPayloadSchema>;
export type TriggerStatement = z.infer<typeof triggerStatementSchema>;
