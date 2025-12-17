import { Inject, Injectable } from '@nestjs/common';
import { SettingDataType, Setting, PrismaService } from '@lib/database';

@Injectable()
export class SettingsUtilsService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}
  changeToUpperCase(value: string) {
    return value.toUpperCase();
  }

  formatRequiredFields(fields?: string[]): string[] {
    return fields ? fields.map((field) => this.changeToUpperCase(field)) : [];
  }

  handleObjectValue(value: any, requiredFields: string[]): any {
    const formattedValue = this.capitalizeObjectKeys(value);
    if (requiredFields.length > 0) {
      this.validateRequiredFields(formattedValue, requiredFields);
      return this.filterObjectByRequiredFields(formattedValue, requiredFields);
    }
    return formattedValue;
  }

  private validateRequiredFields(
    value: Record<string, any>,
    requiredFields: string[],
  ) {
    const missingFields = requiredFields.filter(
      (field) => !Object.keys(value).includes(field),
    );
    if (missingFields.length > 0) {
      throw new Error(
        `Required fields missing in 'value' object: ${missingFields.join(', ')}`,
      );
    }
  }

  private filterObjectByRequiredFields(
    value: Record<string, any>,
    requiredFields: string[],
  ): Record<string, any> {
    return Object.keys(value)
      .filter((key) => requiredFields.includes(key))
      .reduce(
        (filtered: Record<string, any>, key: string) => {
          filtered[key] = value[key];
          return filtered;
        },
        {} as Record<string, any>,
      );
  }

  capitalizeObjectKeys(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      // Return the value if it's not an object
      return obj;
    }

    if (Array.isArray(obj)) {
      // Process each element in the array
      return obj.map(this.capitalizeObjectKeys);
    }

    // Process each key-value pair in the object
    const upperCaseObj: any = {};
    for (const key in obj) {
      //need for refactoring
      if (obj.hasOwnProperty(key)) {
        upperCaseObj[key.toUpperCase()] = this.capitalizeObjectKeys(obj[key]);
      }
    }
    return upperCaseObj;
  }

  async ensureSettingDoesNotExist(name: string, prisma: any) {
    const existingSetting = await prisma.setting.findUnique({
      where: { name },
    });

    if (existingSetting) {
      throw new Error('Setting with this name already exists.');
    }
  }

  async getSettingsByName(name: string): Promise<Setting> {
    const setting = await this.prisma.setting.findUnique({
      where: {
        name,
      },
    });

    if (!setting) {
      throw new Error('Setting not Found.');
    }

    return setting;
  }

  validateReadOnly(setting: any) {
    if (setting.isReadOnly) {
      throw new Error(
        `Setting ${setting.name} is read only and cannot be updated`,
      );
    }
  }

  getDataType(value: string | number | boolean | object): SettingDataType {
    if (typeof value === 'string') {
      return SettingDataType.STRING;
    } else if (typeof value === 'number') {
      return SettingDataType.NUMBER;
    } else if (typeof value === 'boolean') {
      return SettingDataType.BOOLEAN;
    } else if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      return SettingDataType.OBJECT;
    }
    throw new Error(`Invalid data type for 'value': ${typeof value}`);
  }
}
