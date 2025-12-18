import { DataSource, Prisma, PrismaService, SourceType } from '@lib/database';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { GfofasInfo, GlofasDataObject } from 'types/glofas-observation.type';

@Injectable()
export class GlofasServices {
  private readonly logger = new Logger(GlofasServices.name);
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async saveDataInGlofas(riverBasin: string, payload: GlofasDataObject) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existingRecord = await tx.sourcesData.findFirst({
          where: {
            dataSource: DataSource.GLOFAS,
            source: {
              riverBasin,
            },
            info: {
              path: ['info', 'forecastDate'],
              equals: payload.info.forecastDate,
            },
          },
        });

        if (existingRecord) {
          const existingInfo = JSON.parse(JSON.stringify(existingRecord.info));
          this.logger.log(`Found existing record for ${riverBasin}`);

          return tx.sourcesData.update({
            where: { id: existingRecord.id },
            data: {
              info: {
                ...existingInfo,
                ...payload,
              },
              updatedAt: new Date(),
            },
          });
        }
        this.logger.log(`No record found. Creating new for: ${riverBasin}`);

        return tx.sourcesData.create({
          data: {
            type: SourceType.WATER_LEVEL,
            dataSource: DataSource.GLOFAS,
            info: JSON.parse(JSON.stringify(payload)),
            source: {
              connectOrCreate: {
                where: { riverBasin },
                create: {
                  riverBasin,
                  source: [DataSource.GLOFAS],
                },
              },
            },
          },
        });
      });
    } catch (error: any) {
      this.logger.error(`Error saving data for ${riverBasin}:`, error);
      throw error;
    }
  }
  async getSourceData(
    type: SourceType,
    riverBasin: string,
  ): Promise<Array<{ seriesId: string; stationName: string }>> {
    try {
      const sourceData = await this.prisma.sourcesData.findMany({
        where: {
          dataSource: DataSource.GLOFAS,
          source: {
            riverBasin,
          },
          type,
        },
        select: {
          info: true,
        },
      });

      return sourceData.map((value) => {
        const info = value.info as GfofasInfo;
        return {
          seriesId: info['location'].basinId,
          stationName: info['location'].basinId,
        };
      });
    } catch (error: any) {
      this.logger.error('Error while fetching source data', error);
      throw error;
    }
  }
}
