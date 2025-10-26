import { getMongo, toObjectId } from '@/src/lib/db/mongodb';
import type { ObjectId } from 'mongodb';

export type VoteType = 'UP' | 'DOWN';

export interface VoteDoc {
  _id: ObjectId;
  userId: ObjectId;
  reportId: ObjectId;
  voteType: VoteType;
  createdAt: Date;
}

export const VoteModel = {
  async createVote(userId: string, reportId: string, type: VoteType): Promise<VoteDoc> {
    const { collections } = await getMongo();
    const doc = {
      userId: toObjectId(userId),
      reportId: toObjectId(reportId),
      voteType: type,
      createdAt: new Date(),
    };
    const res = await collections.votes.insertOne(doc);
    return { _id: res.insertedId, ...doc } as VoteDoc;
  },

  async findVote(userId: string, reportId: string): Promise<VoteDoc | null> {
    const { collections } = await getMongo();
    const doc = (await collections.votes.findOne({ userId: toObjectId(userId), reportId: toObjectId(reportId) })) as VoteDoc | null;
    return doc;
  },

  async updateVote(userId: string, reportId: string, type: VoteType): Promise<VoteDoc> {
    const { collections } = await getMongo();
    const res = await collections.votes.findOneAndUpdate(
      { userId: toObjectId(userId), reportId: toObjectId(reportId) },
      { $set: { voteType: type } },
      { returnDocument: 'after', upsert: false }
    );
    console.log('VOTE:UPDATE', userId, reportId, type, res);
    if (!res) throw new Error('Vote not found');
    return res as VoteDoc;
  },

  async deleteVote(userId: string, reportId: string): Promise<boolean> {
    const { collections } = await getMongo();
    const res = await collections.votes.deleteOne({ userId: toObjectId(userId), reportId: toObjectId(reportId) });
    return res.deletedCount === 1;
  },

  async getUserVotes(userId: string): Promise<VoteDoc[]> {
    const { collections } = await getMongo();
    const docs = (await collections.votes.find({ userId: toObjectId(userId) }).toArray()) as VoteDoc[];
    return docs;
  },

  async deleteVotesByReport(reportId: string): Promise<number> {
    const { collections } = await getMongo();
    const res = await collections.votes.deleteMany({ reportId: toObjectId(reportId) });
    return res.deletedCount;
  },
};
