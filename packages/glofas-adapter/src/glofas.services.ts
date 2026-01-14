import { DataSource, Prisma, PrismaService, SourceType } from '@lib/database';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  GfofasInfo,
  GlofasDataObject,
  GlofasInfoObject,
} from 'types/glofas-observation.type';

@Injectable()
export class GlofasServices {
  private readonly logger = new Logger(GlofasServices.name);
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async saveDataInGlofas(
    riverBasin: string,
    payload: GlofasDataObject,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const returnPeriodInfos = this.expandReturnPeriodInfos(payload.info);
        for (const info of returnPeriodInfos) {
          const existingRecord = await tx.sourcesData.findFirst({
            where: {
              dataSource: DataSource.GLOFAS,
              source: {
                riverBasin,
              },
              AND: [
                {
                  info: {
                    path: ['forecastDate'],
                    equals: payload.info.forecastDate,
                  },
                },
                {
                  info: {
                    path: ['returnPeriod'],
                    equals: info.returnPeriod,
                  },
                },
              ],
            },
          });

          if (existingRecord) {
            const existingInfo = JSON.parse(
              JSON.stringify(existingRecord.info),
            );
            this.logger.log(
              `Found existing record for ${riverBasin}; return period ${info.returnPeriod}`,
            );

            await tx.sourcesData.update({
              where: { id: existingRecord.id },
              data: {
                info: {
                  ...existingInfo,
                  ...info,
                },
                updatedAt: new Date(),
              },
            });
          } else {
            this.logger.log(
              `No record found. Creating new for ${riverBasin}; return period ${info.returnPeriod}`,
            );

            await tx.sourcesData.create({
              data: {
                type: SourceType.PROB_FLOOD,
                dataSource: DataSource.GLOFAS,
                info: info,
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
          }
        }
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

  private expandReturnPeriodInfos(data: GlofasInfoObject) {
    const info = JSON.parse(JSON.stringify(data));
    const maxProbability = info?.pointForecastData?.maxProbability?.data ?? '';
    const returnPeriodValues = maxProbability
      .split('/')
      .map((v: string) => Number(v.trim()) || 0);

    const returnPeriods = [
      {
        period: 2,
        value: returnPeriodValues[0] ?? 0,
        tableKey: 'returnPeriodTable2yr',
      },
      {
        period: 5,
        value: returnPeriodValues[1] ?? 0,
        tableKey: 'returnPeriodTable5yr',
      },
      {
        period: 20,
        value: returnPeriodValues[2] ?? 0,
        tableKey: 'returnPeriodTable20yr',
      },
    ];

    return returnPeriods?.map((rp) => ({
      returnPeriod: `${rp.period} years`,
      returnPeriodTable: info[rp.tableKey],
      pointForecastData: {
        ...info.pointForecastData,
        maxProbability: {
          data: rp.value,
          header: `Maximum probability (${rp.period} yr)`,
        },
      },
      hydrographImageUrl: info.hydrographImageUrl,
      forecastDate: info.forecastDate,
    }));
  }
}
