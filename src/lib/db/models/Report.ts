import { getMongo, toObjectId } from '@/src/lib/db/mongodb';
import type { ObjectId } from 'mongodb';
import type { ReportFilters } from '@/src/lib/db/types/schemas';
import { format } from 'date-fns';

export type ReportCategory = 'POTHOLE' | 'GARBAGE' | 'STREETLIGHT' | 'WATER' | 'ROAD' | 'OTHER';
export type ReportStatus = 'PENDING' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export interface RoadData {
  roadName: string;
  roadType: string;
  roadId?: string;
  district?: string;
  sectionLabel?: string;
  distanceFromRoad: number; // meters
  matchConfidence: number;  // 0-100
  tileCoordinates: { z: number; x: number; y: number };
  matchedAt: Date;
  roadStartsAt?: string;
  roadEndsAt?: string;
  division?: string;
  subDivision?: string;
  section?: string;
  officials?: {
    ee: { title: string; mobile: string; email: string };
    aee: { title: string; mobile: string; email: string };
    ae: { title: string; mobile: string; email: string };
  };
  measuredLength?: number;
}

export interface ReportDoc {
  _id: ObjectId;
  reportNumber: string;
  userId: ObjectId;

  category: ReportCategory;
  title: string;
  description: string;

  latitude: number;
  longitude: number;
  location: { type: 'Point'; coordinates: [number, number] };
  address?: string;
  district?: string;
  locationSource: 'MANUAL' | 'PHOTO_EXIF' | 'GPS';

  imageUrl: string;
  imageMetadata?: {
    originalName: string;
    size: number;
    mimeType: string;
    width?: number;
    height?: number;
    thumbnailUrl?: string;
  };

  status: ReportStatus;
  upvotes: number;
  downvotes: number;

  roadData?: RoadData;

  adminComment?: string;
  resolvedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type ReportInput = {
  userId: ObjectId;
  category: ReportCategory;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  district?: string;
  locationSource: 'MANUAL' | 'PHOTO_EXIF' | 'GPS';
  imageUrl: string;
  imageMetadata?: {
    originalName: string;
    size: number;
    mimeType: string;
    width?: number;
    height?: number;
    thumbnailUrl?: string;
  };
  status?: ReportStatus;
  roadData?: RoadData;
  adminComment?: string;
  resolvedAt?: Date;
  reportNumber?: string;
};

export interface ReportStatistics {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
}

export const ReportModel = {
  async generateReportNumber(): Promise<string> {
    const { db } = await getMongo();
    const today = format(new Date(), 'yyyyMMdd');
    const key = `reportNumber-${today}`;
    const counters = db.collection<{ _id: string; seq: number }>('counters');
    const counterRes = await counters.findOneAndUpdate(
      { _id: key },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    const seq = (counterRes?.seq as number | undefined) || 1;
    const seqStr = String(seq).padStart(4, '0');
    return `IMC-${today}-${seqStr}`;
  },

  async createReport(data: ReportInput): Promise<ReportDoc> {
    const { collections } = await getMongo();
    const now = new Date();
    const reportNumber = data.reportNumber || (await this.generateReportNumber());
    const doc: Omit<ReportDoc, '_id'> = {
      reportNumber,
      userId: data.userId,
      category: data.category,
      title: data.title,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      location: { type: 'Point', coordinates: [data.longitude, data.latitude] },
      address: data.address,
      district: data.district,
      locationSource: data.locationSource,
      imageUrl: data.imageUrl,
      imageMetadata: data.imageMetadata,
      status: data.status || 'PENDING',
      upvotes: 0,
      downvotes: 0,
      roadData: data.roadData,
      adminComment: data.adminComment,
      resolvedAt: data.resolvedAt,
      createdAt: now,
      updatedAt: now,
    };

    const res = await collections.reports.insertOne(doc);
    return { _id: res.insertedId, ...doc } as ReportDoc;
  },

  async findReportById(id: string): Promise<ReportDoc | null> {
    const { collections } = await getMongo();
    const doc = (await collections.reports.findOne({ _id: toObjectId(id) })) as ReportDoc | null;
    return doc;
  },

  async findReports(filters: Partial<ReportFilters> & { page?: number; limit?: number }): Promise<ReportDoc[]> {
    const { collections } = await getMongo();
    const query: Record<string, unknown> = {};
    if (filters.category) query.category = filters.category;
    if (filters.status) query.status = filters.status;
    if (filters.district) query.district = filters.district;
    if (filters.division) query['roadData.division'] = filters.division;
    if (filters.section) query['roadData.section'] = filters.section;
    if (filters.userId) query.userId = toObjectId(filters.userId);

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    let cursor = collections.reports.find(query);

    const sort = filters.sort as 'date' | 'upvotes' | 'distance' | undefined;
    if (sort === 'upvotes') {
      cursor = cursor.sort({ upvotes: -1 });
    } else if (sort === 'date' || !sort) {
      cursor = cursor.sort({ createdAt: -1 });
    }

    if (sort === 'distance' && filters.lat !== undefined && filters.lng !== undefined) {
      const pipeline: Record<string, unknown>[] = [
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [filters.lng, filters.lat] },
            distanceField: 'dist.calculated',
            spherical: true,
            key: 'location',
          },
        },
      ];
      if (Object.keys(query).length) pipeline.push({ $match: query });
      pipeline.push({ $limit: limit });
      const all = (await collections.reports.aggregate(pipeline).toArray()) as ReportDoc[];
      return all;
    }

    const items = (await cursor.skip((page - 1) * limit).limit(limit).toArray()) as ReportDoc[];
    return items;
  },

  async updateReport(id: string, data: Partial<ReportDoc>): Promise<ReportDoc> {
    const { collections } = await getMongo();
    const update: Partial<ReportDoc> & { updatedAt: Date } = { ...data, updatedAt: new Date() };
    const res = await collections.reports.findOneAndUpdate(
      { _id: toObjectId(id) },
      { $set: update },
      { returnDocument: 'after' }
    );
    const value = res as ReportDoc | null;
    if (!value) throw new Error('Report not found');
    return value;
  },

  async deleteReport(id: string): Promise<boolean> {
    const { collections } = await getMongo();
    const res = await collections.reports.deleteOne({ _id: toObjectId(id) });
    return res.deletedCount === 1;
  },

  async incrementVote(id: string, type: 'up' | 'down'): Promise<ReportDoc> {
    const { collections } = await getMongo();
    const inc = type === 'up' ? { upvotes: 1 } : { downvotes: 1 };
    const res = await collections.reports.findOneAndUpdate(
      { _id: toObjectId(id) },
      { $inc: inc },
      { returnDocument: 'after' }
    );
    const value = res as ReportDoc | null;
    if (!value) throw new Error('Report not found');
    return value;
  },

  async adjustVotes(id: string, deltaUp: number, deltaDown: number): Promise<ReportDoc> {
    const { collections } = await getMongo();
    const filter = { _id: toObjectId(id) } as const;
    const res = await collections.reports.findOneAndUpdate(
      filter,
      { $inc: { upvotes: deltaUp, downvotes: deltaDown } },
      { returnDocument: 'after' }
    );
    let value = res as ReportDoc | null;

    if (!value) {
      const upd = await collections.reports.updateOne(filter, { $inc: { upvotes: deltaUp, downvotes: deltaDown } });
      if (upd.matchedCount === 0) throw new Error('Report not found');
      value = (await collections.reports.findOne(filter)) as ReportDoc | null;
      if (!value) throw new Error('Report not found');
    }

    if (value.upvotes < 0 || value.downvotes < 0) {
      const clamped = {
        upvotes: Math.max(0, value.upvotes),
        downvotes: Math.max(0, value.downvotes),
      } as Partial<ReportDoc>;
      await collections.reports.updateOne(filter, { $set: clamped });
      value = (await collections.reports.findOne(filter)) as ReportDoc | null;
      if (!value) throw new Error('Report not found');
    }

    return value;
  },

  async findNearbyReports(lat: number, lng: number, radiusKm: number): Promise<ReportDoc[]> {
    const { collections } = await getMongo();
    const meters = radiusKm * 1000;
    const docs = (await collections.reports
      .find({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: meters,
          },
        },
      })
      .limit(100)
      .toArray()) as ReportDoc[];
    return docs;
  },

  async getStatistics(): Promise<ReportStatistics> {
    const { collections } = await getMongo();
    const total = await collections.reports.countDocuments();
    const byStatusAgg = await collections.reports
      .aggregate([{ $group: { _id: '$status', c: { $sum: 1 } } }])
      .toArray();
    const byCategoryAgg = await collections.reports
      .aggregate([{ $group: { _id: '$category', c: { $sum: 1 } } }])
      .toArray();
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    for (const s of byStatusAgg as { _id: string; c: number }[]) byStatus[s._id] = s.c;
    for (const c of byCategoryAgg as { _id: string; c: number }[]) byCategory[c._id] = c.c;
    return { total, byStatus, byCategory };
  },
};
