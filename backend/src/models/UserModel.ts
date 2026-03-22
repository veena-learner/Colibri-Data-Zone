import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { BaseModel } from './BaseModel';
import { User } from '../types';
import { ENTITY_TYPES, USER_ROLES, UserRole } from '../config/constants';

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
  domainIds?: string[];
}

export class UserModel extends BaseModel {
  private getKeys(email: string) {
    return {
      PK: `${ENTITY_TYPES.USER}#${email}`,
      SK: 'METADATA',
    };
  }

  async create(input: CreateUserInput): Promise<User> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const { PK, SK } = this.getKeys(input.email);

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const user: User = {
      PK,
      SK,
      id,
      email: input.email,
      name: input.name,
      password: hashedPassword,
      role: input.role || USER_ROLES.VIEWER,
      domainIds: input.domainIds || [],
      createdAt: now,
      updatedAt: now,
    };

    return this.put(user);
  }

  async getByEmail(email: string): Promise<User | null> {
    const { PK, SK } = this.getKeys(email);
    return this.get<User>(PK, SK);
  }

  async getById(id: string): Promise<User | null> {
    const users = await this.listAll();
    return users.find((u) => u.id === id) || null;
  }

  async update(email: string, updates: Partial<Omit<CreateUserInput, 'password'>>): Promise<User> {
    const { PK, SK } = this.getKeys(email);
    return super.updateByKey<User>(PK, SK, {
      ...updates,
      updatedAt: new Date().toISOString(),
    } as Partial<User>);
  }

  async updatePassword(email: string, newPassword: string): Promise<void> {
    const { PK, SK } = this.getKeys(email);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await super.updateByKey<User>(PK, SK, {
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    } as Partial<User>);
  }

  async deleteByEmail(email: string): Promise<void> {
    const { PK, SK } = this.getKeys(email);
    await this.delete(PK, SK);
  }

  async listAll(limit?: number): Promise<User[]> {
    return this.scan<User>(
      'begins_with(PK, :prefix)',
      { ':prefix': `${ENTITY_TYPES.USER}#` },
      limit
    );
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }
}

export const userModel = new UserModel();
