import { DataSource, PrismaService, SourceType } from '@lib/database';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  GlofasInfo,
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
        // Step 4: expand indicator into one record per return period (2yr, 5yr, 20yr)
        const returnPeriodInfos = this.expandReturnPeriodInfos(payload.info);
        this.logger.log(`[Store] [${riverBasin}] Saving ${returnPeriodInfos.length} return period record(s)`);

        for (const info of returnPeriodInfos) {
          // Step 4.1: upsert by (riverBasin, forecastDate, returnPeriod)
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
                    equals: info.forecastDate,
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
            // Step 4.2: already stored for this forecastDate + returnPeriod — skip
            this.logger.log(`[Store] [${riverBasin}] Already exists for forecastDate=${info.forecastDate} returnPeriod=${info.returnPeriod}, skipping`);
            continue;
          } else {
            // Step 4.2: no record — create new
            this.logger.log(`[Store] [${riverBasin}] Creating new record for forecastDate=${info.forecastDate} returnPeriod=${info.returnPeriod}`);

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
        const info = value.info as GlofasInfo;
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
      { period: 2,  value: returnPeriodValues[0] ?? 0 },
      { period: 5,  value: returnPeriodValues[1] ?? 0 },
      { period: 20, value: returnPeriodValues[2] ?? 0 },
    ];

    return returnPeriods.map((rp) => ({
      returnPeriod: `${rp.period} years`,
      returnPeriodTable: info.returnPeriodTable,
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
