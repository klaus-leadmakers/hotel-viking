import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from './entities/user.entity';
import { Role } from '../auth/roles.enum';
@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  private hashEmail(email: string): string {
    return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
  }

  async create(email: string, password: string, role: Role = Role.USER): Promise<User> {
    const emailHash = this.hashEmail(email);
    const existing = await this.repo.findOne({ where: { emailHash } });
    if (existing) throw new ConflictException('Email allerede i brug');
    const user = this.repo.create({
      emailHash,
      emailEnc: Buffer.from(email),
      passwordHash: await bcrypt.hash(password, 12),
      role,
    });
    return this.repo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { emailHash: this.hashEmail(email) } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Bruger ikke fundet');
    return user;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async findAll(): Promise<User[]> { return this.repo.find(); }

  async softDelete(id: string): Promise<void> { await this.repo.softDelete(id); }
}
