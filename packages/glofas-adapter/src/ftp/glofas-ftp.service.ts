import { Injectable } from '@nestjs/common';
import { PassThrough } from 'stream';
import * as ftp from 'basic-ftp';

@Injectable()
export class GlofasFtpService {
  private host!: string;
  private user!: string;
  private password!: string;

  configure(host: string, user: string, password: string) {
    this.host = host;
    this.user = user;
    this.password = password;
  }

  private async connect() {
    const ftpClient = new ftp.Client();
    await ftpClient.access({ host: this.host, user: this.user, password: this.password, secure: false });
    return ftpClient;
  }

  async downloadFile(remotePath: string): Promise<Buffer> {
    let ftpClient;
    try {
      ftpClient = await this.connect();
      const chunks: Buffer[] = [];
      const stream = new PassThrough();
      stream.on('data', (chunk) => chunks.push(chunk));
      await ftpClient.downloadTo(stream, remotePath);
      return Buffer.concat(chunks);
    } catch (error: any) {
      throw new Error(`FTP download failed for ${remotePath}: ${error.message}`);
    } finally {
      ftpClient?.close();
    }
  }
}
