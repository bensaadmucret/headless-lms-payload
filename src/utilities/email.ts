import net from 'node:net';

const SMTP_TIMEOUT_MS = 5000;
const CRLF = '\r\n';
const RETRYABLE_CODES = new Set(['ENOTFOUND', 'ECONNREFUSED']);

const extractAddress = (value: string): string => {
  const match = value.match(/<([^>]+)>/);
  const address = match?.[1];
  return address ?? value;
};

const isRetryable = (error: unknown): boolean => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as NodeJS.ErrnoException).code;
    return typeof code === 'string' && RETRYABLE_CODES.has(code);
  }
  return false;
};

export interface SendEmailOptions {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailOptions): Promise<void> {
  const smtpConfig = getSmtpConfig();
  const hostCandidates = Array.from(new Set([smtpConfig.host, 'localhost', '127.0.0.1']));

  const fromAddress = extractAddress(smtpConfig.from);
  const toAddress = extractAddress(to);
  const contentType = html ? 'text/html; charset=UTF-8' : 'text/plain; charset=UTF-8';
  const normalizedBody = (html ?? text).replace(/\r?\n/g, CRLF);
  const body = normalizedBody.replace(/^\./gm, '..');
  const message = [
    `From: ${smtpConfig.from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: ${contentType}`,
    '',
    body,
  ].join(CRLF);

  let lastError: unknown;

  for (const host of hostCandidates) {
    try {
      await sendViaHost(host, smtpConfig.port, message, fromAddress, toAddress);
      return;
    } catch (error) {
      lastError = error;
      if (isRetryable(error)) {
        continue;
      }
      throw error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error('Impossible d\'envoyer l\'email via SMTP');
}

async function sendViaHost(host: string, port: number, message: string, fromAddress: string, toAddress: string): Promise<void> {
  const socket = net.createConnection({ host, port });
  socket.setEncoding('utf8');

  const readResponse = () =>
    new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('SMTP timeout'));
      }, SMTP_TIMEOUT_MS);

      function cleanup() {
        clearTimeout(timer);
        socket.off('error', onError);
        socket.off('data', onData);
      }

      function onData(chunk: Buffer) {
        cleanup();
        resolve(chunk.toString('utf8'));
      }

      function onError(error: Error) {
        cleanup();
        reject(error);
      }

      socket.once('data', onData);
      socket.once('error', onError);
    });

  const sendCommand = async (command: string, expectedCode: string) => {
    socket.write(`${command}${CRLF}`);
    const response = await readResponse();

    const lines = response
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const finalLine = lines.at(-1) ?? response.trim();

    if (!finalLine.startsWith(expectedCode)) {
      throw new Error(`SMTP error ${finalLine}`);
    }
    return finalLine;
  };

  try {
    await waitForConnect(socket);

    const greeting = await readResponse();
    if (!greeting.startsWith('220')) {
      throw new Error(`SMTP error ${greeting.trim()}`);
    }

    await sendCommand('EHLO localhost', '250');
    await sendCommand(`MAIL FROM:<${fromAddress}>`, '250');
    await sendCommand(`RCPT TO:<${toAddress}>`, '250');
    await sendCommand('DATA', '354');

    socket.write(`${message}${CRLF}.${CRLF}`);

    const dataResponse = await readResponse();
    if (!dataResponse.startsWith('250')) {
      throw new Error(`SMTP error ${dataResponse.trim()}`);
    }

    await sendCommand('QUIT', '221').catch(() => undefined);
  } catch (error) {
    socket.destroy();
    throw error;
  } finally {
    if (!socket.destroyed) {
      socket.end();
    }
  }
}

function waitForConnect(socket: net.Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    const onConnect = () => {
      socket.off('error', onError);
      resolve();
    };

    const onError = (error: Error) => {
      socket.off('connect', onConnect);
      reject(error);
    };

    socket.once('connect', onConnect);
    socket.once('error', onError);
  });
}

function getSmtpConfig() {
  const host = process.env.BETTER_AUTH_SMTP_HOST ?? 'localhost';
  const port = Number(process.env.BETTER_AUTH_SMTP_PORT ?? '1025');
  const from = process.env.BETTER_AUTH_SMTP_FROM ?? 'MedCoach Test <no-reply@medcoach.test>';

  return { host, port, from };
}
