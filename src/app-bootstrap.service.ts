import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminService } from './admin/admin.service';

@Injectable()
export class AppBootstrapService implements OnModuleInit {
  constructor(
    private config: ConfigService,
    private admin: AdminService,
  ) {}

  async onModuleInit() {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const mdp = this.config.get<string>('ADMIN_MOT_DE_PASSE');
    if (email && mdp) {
      await this.admin.ensureAdmin(email, mdp);
    }
  }
}
