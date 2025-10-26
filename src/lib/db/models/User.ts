import { getMongo, toObjectId } from '@/src/lib/db/mongodb';
import type { ObjectId } from 'mongodb';

export type UserRole = 'CITIZEN' | 'ADMIN';

export interface UserDoc {
  _id: ObjectId;
  email: string;
  phone: string;
  password: string;
  name: string;
  role: UserRole;
  karma: number;
  district?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserInput = {
  email: string;
  phone: string;
  password: string;
  name: string;
  role?: UserRole;
  district?: string;
};

export const UserModel = {
  async createUser(data: UserInput): Promise<UserDoc> {
    const { collections } = await getMongo();
    const now = new Date();
    const doc = {
      email: data.email.toLowerCase(),
      phone: data.phone,
      password: data.password,
      name: data.name,
      role: data.role || 'CITIZEN',
      karma: 0,
      district: data.district,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const res = await collections.users.insertOne(doc);
      return { _id: res.insertedId, ...doc } as unknown as UserDoc;
    } catch (e) {
      const err = e as Error & { code?: number };
      if (err.code === 11000) {
        throw new Error('User with email or phone already exists');
      }
      throw err;
    }
  },

  async findUserByEmail(email: string): Promise<UserDoc | null> {
    const { collections } = await getMongo();
    const doc = (await collections.users.findOne({ email: email.toLowerCase() })) as UserDoc | null;
    return doc;
  },

  async findUserById(id: string): Promise<UserDoc | null> {
    const { collections } = await getMongo();
    const doc = (await collections.users.findOne({ _id: toObjectId(id) })) as UserDoc | null;
    return doc;
  },

  async updateUser(id: string, data: Partial<UserDoc>): Promise<UserDoc> {
    const { collections } = await getMongo();
    const update = { ...data, updatedAt: new Date() };
    const res = await collections.users.findOneAndUpdate(
      { _id: toObjectId(id) },
      { $set: update },
      { returnDocument: 'after' }
    );
    const value = res as UserDoc | null;
    if (!value) throw new Error('User not found');
    return value;
  },

  async deleteUser(id: string): Promise<boolean> {
    const { collections } = await getMongo();
    const res = await collections.users.deleteOne({ _id: toObjectId(id) });
    return res.deletedCount === 1;
  },
};
