import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';

@Injectable()
export class MewsService {
  private readonly logger = new Logger(MewsService.name);
  private readonly api: AxiosInstance;
  private accessToken: string;
  private clientToken: string;
  private environment: string;
  private apiUrl: string;

  constructor(private config: ConfigService) {
    this.accessToken  = config.get('MEWS_ACCESS_TOKEN', '');
    this.clientToken  = config.get('MEWS_CLIENT_TOKEN', '');
    this.environment  = config.get('MEWS_ENV', 'demo');
    this.apiUrl       = config.get('MEWS_API_URL', 'https://api.mews-demo.com/api/connector/v1');

    this.api = axios.create({
      baseURL: this.apiUrl,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.logger.log(`Mews tilsluttet [${this.environment.toUpperCase()}]: ${this.apiUrl}`);
  }

  isConfigured(): boolean {
    return !!(this.accessToken && this.clientToken);
  }

  getEnvironment(): string {
    return this.environment;
  }

  private base() {
    return {
      ClientToken: this.clientToken,
      AccessToken: this.accessToken,
      Client: 'HotelVikingPlatform/1.0',
    };
  }

  private async call<T>(endpoint: string, body: object = {}): Promise<T> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Mews er ikke konfigureret. Tilføj MEWS_ACCESS_TOKEN og MEWS_CLIENT_TOKEN.',
      );
    }
    try {
      const { data } = await this.api.post<T>(endpoint, { ...this.base(), ...body });
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.Message ?? err.message;
      this.logger.error(`Mews API fejl [${endpoint}]: ${msg}`);
      throw new ServiceUnavailableException(`Mews API fejl: ${msg}`);
    }
  }

  async getConfiguration() {
    return this.call('/configuration/get', { Extent: { Configuration: true } });
  }

  async getSpaces() {
    return this.call('/spaces/getAll', {
      Extent: { Spaces: true, SpaceFeatures: true },
    });
  }

  async getServices() {
    return this.call('/services/getAll', { Extent: { Services: true } });
  }

  async getReservations(startUtc: string, endUtc: string) {
    return this.call('/reservations/getAll', {
      StartUtc: startUtc,
      EndUtc: endUtc,
      Extent: { Reservations: true, Customers: true },
    });
  }

  async searchCustomers(email: string) {
    return this.call('/customers/search', { Email: email });
  }

  async checkIn(reservationId: string) {
    return this.call('/reservations/start', { ReservationId: reservationId });
  }

  async checkOut(reservationId: string) {
    return this.call('/reservations/process', { ReservationId: reservationId });
  }

  /** Opdater tokens i memory + skriv til .env for persistens */
  async updateTokens(tokens: {
    accessToken?: string;
    clientToken?: string;
    environment?: string;
  }) {
    if (tokens.accessToken !== undefined)  this.accessToken  = tokens.accessToken;
    if (tokens.clientToken !== undefined)  this.clientToken  = tokens.clientToken;
    if (tokens.environment !== undefined)  this.environment  = tokens.environment;

    // Opdater axios baseURL hvis miljø skifter
    const baseUrl = this.environment === 'production'
      ? 'https://api.mews.com/api/connector/v1'
      : 'https://api.mews-demo.com/api/connector/v1';
    this.api.defaults.baseURL = baseUrl;

    // Skriv til .env filen for persistens
    try {
      const envPath = '/opt/hotel-platform/.env';
      if (fs.existsSync(envPath)) {
        let env = fs.readFileSync(envPath, 'utf8');
        const updates: Record<string, string> = {};
        if (tokens.accessToken !== undefined) updates['MEWS_ACCESS_TOKEN'] = tokens.accessToken;
        if (tokens.clientToken !== undefined)  updates['MEWS_CLIENT_TOKEN']  = tokens.clientToken;
        if (tokens.environment !== undefined)  updates['MEWS_ENV']           = tokens.environment;
        updates['MEWS_API_URL'] = baseUrl;

        for (const [key, val] of Object.entries(updates)) {
          const re = new RegExp(`^${key}=.*$`, 'm');
          if (re.test(env)) {
            env = env.replace(re, `${key}=${val}`);
          } else {
            env += `\n${key}=${val}`;
          }
        }
        fs.writeFileSync(envPath, env);
        this.logger.log('Mews tokens opdateret i .env');
      }
    } catch (e) {
      this.logger.warn('Kunne ikke skrive til .env: ' + e);
    }

    return {
      message: 'Mews tokens opdateret (aktive med det samme)',
      configured: this.isConfigured(),
      environment: this.environment,
      apiUrl: baseUrl,
    };
  }
}
