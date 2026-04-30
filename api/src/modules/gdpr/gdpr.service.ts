import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
@Injectable()
export class GdprService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async exportUserData(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const consents = await this.dataSource.query(
      'SELECT purpose, granted_at, revoked_at FROM gdpr.consents WHERE user_id = $1', [userId]
    );
    await this.dataSource.query(
      `INSERT INTO audit.access_log(user_id_hash, action, resource, result)
       VALUES(md5($1::text), 'EXPORT', 'user_data', 'success')`, [userId]
    );
    await this.dataSource.query(
      `INSERT INTO gdpr.dsar_requests(user_id, request_type, status, completed_at)
       VALUES($1::uuid, 'EXPORT', 'COMPLETED', NOW())`, [userId]
    );
    return {
      exportedAt: new Date().toISOString(),
      gdprBasis: 'GDPR Art. 15 - Ret til indsigt',
      user: { id: user?.id, role: user?.role, createdAt: user?.createdAt },
      consents,
    };
  }

  async eraseUserData(userId: string) {
    await this.dataSource.query(
      `INSERT INTO audit.access_log(user_id_hash, action, resource, result)
       VALUES(md5($1::text), 'ERASE', 'user_data', 'success')`, [userId]
    );
    await this.dataSource.query(
      `UPDATE public.users
       SET email_enc = NULL, password_hash = NULL, deleted_at = NOW()
       WHERE id = $1::uuid`, [userId]
    );
    await this.dataSource.query(
      `INSERT INTO gdpr.dsar_requests(user_id, request_type, status, completed_at)
       VALUES($1::uuid, 'ERASE', 'COMPLETED', NOW())`, [userId]
    );
    return {
      message: 'Dine data er anonymiseret og slettet (GDPR Art. 17)',
      deletedAt: new Date().toISOString(),
    };
  }

  async getConsents(userId: string) {
    return this.dataSource.query(
      'SELECT id, purpose, granted_at, revoked_at FROM gdpr.consents WHERE user_id = $1::uuid ORDER BY granted_at DESC',
      [userId]
    );
  }

  async revokeConsent(userId: string, consentId: string) {
    await this.dataSource.query(
      'UPDATE gdpr.consents SET revoked_at = NOW() WHERE id = $1::uuid AND user_id = $2::uuid',
      [consentId, userId]
    );
    return { message: 'Samtykke tilbagetrukket', revokedAt: new Date().toISOString() };
  }
}
