import { FileUploadService } from '@/src/lib/services/FileUploadService';
import { ExifExtractor } from '@/src/lib/services/ExifExtractor';
import { RoadMatcher } from '@/src/lib/services/RoadMatcher';
import { ReportModel, type ReportDoc, type ReportStatus } from '@/src/lib/db/models/Report';
import type { CreateReportInput } from '@/src/lib/db/types/schemas';
import { toObjectId } from '@/src/lib/db/mongodb';
import { pwdOfficialsService } from '@/src/lib/services/PwdOfficialsService';
import { logger } from '@/src/lib/tiles/utils/logger';

export class ReportService {
  private uploader = new FileUploadService();
  private exif = new ExifExtractor();
  private matcher = new RoadMatcher();

  async createReport(userId: string, data: CreateReportInput, imageFile: File): Promise<ReportDoc> {
    // 1. upload
    const uploaded = await this.uploader.uploadImage(imageFile, 'reports');

    // 2. extract GPS
    const ab = await imageFile.arrayBuffer();
    const gps = await this.exif.extractGPS(Buffer.from(new Uint8Array(ab)));

    // 3. pick coordinates
    const lat = gps?.latitude ?? data.latitude;
    const lng = gps?.longitude ?? data.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new Error('Location not provided and not found in image EXIF');
    }

    // 4. match to road
    const road = await this.matcher.matchCoordinatesToRoad(lat, lng);

    // 5. persist
    const doc = await ReportModel.createReport({
      reportNumber: undefined,
      userId: toObjectId(userId),
      category: data.category,
      title: data.title,
      description: data.description,
      latitude: lat,
      longitude: lng,
      address: undefined,
      district: undefined,
      locationSource: gps ? 'PHOTO_EXIF' : 'MANUAL',
      imageUrl: uploaded.url,
      imageMetadata: {
        originalName: imageFile.name,
        size: uploaded.size,
        mimeType: uploaded.mimeType,
        width: uploaded.width,
        height: uploaded.height,
      },
      status: 'PENDING',
      roadData: road
        ? {
            roadName: road.roadName,
            roadType: road.roadType,
            roadId: road.roadId,
            district: road.district,
            sectionLabel: road.sectionLabel,
            distanceFromRoad: road.distanceFromRoad,
            matchConfidence: road.matchConfidence,
            tileCoordinates: road.tileCoordinates,
            matchedAt: new Date(),
          }
        : undefined,
    });

    // Fire-and-forget enrichment of Kerala PWD officials based on roadId
    if (doc.roadData?.roadId) {
      const idNum = Number(doc.roadData.roadId);
      if (Number.isFinite(idNum) && idNum > 0) {
        const log = logger.child({ scope: 'ReportService.enrichOfficials', reportId: doc._id.toString(), sectionId: idNum });
        (async () => {
          try {
            const res = await pwdOfficialsService.fetchOfficials(idNum);
            const rd = doc.roadData!;
            const updated = await ReportModel.updateReport(doc._id.toString(), {
              roadData: {
                ...rd,
                roadStartsAt: res.data.roadStartsAt,
                roadEndsAt: res.data.roadEndsAt,
                division: res.data.division,
                subDivision: res.data.subDivision,
                section: res.data.section,
                officials: res.data.officials,
                measuredLength: res.data.measuredLength,
              },
            });
            log.info('Officials enriched');
            return updated;
          } catch (e) {
            log.warn('Officials enrichment failed', { error: (e as Error).message });
          }
        })().catch(() => void 0);
      }
    }

    return doc;
  }

  async updateReportStatus(reportId: string, status: ReportStatus, adminComment?: string): Promise<ReportDoc> {
    const update: Partial<ReportDoc> = { status, adminComment };
    if (status === 'RESOLVED') update.resolvedAt = new Date();
    const doc = await ReportModel.updateReport(reportId, update);
    return doc;
  }

  async getReportWithDetails(reportId: string): Promise<ReportDoc> {
    const doc = await ReportModel.findReportById(reportId);
    if (!doc) throw new Error('Report not found');
    return doc;
  }

  async searchReports(filters: Parameters<typeof ReportModel.findReports>[0]) {
    return ReportModel.findReports(filters);
  }

  async getNearbyReports(lat: number, lng: number, radiusKm: number) {
    return ReportModel.findNearbyReports(lat, lng, radiusKm);
  }
}
