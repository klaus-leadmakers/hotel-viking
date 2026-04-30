import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn } from 'typeorm';
import { Role } from '../../auth/roles.enum';
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'email_hash', unique: true })
  emailHash: string;

  @Column({ name: 'email_enc', type: 'bytea', nullable: true })
  emailEnc: Buffer;

  @Column({ name: 'password_hash', type: 'text', nullable: true })
  passwordHash: string;

  @Column({ type: 'text', default: Role.USER })
  role: Role;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
