export const env = {
  databaseUrl: process.env.DATABASE_URL ?? '',
  secretCodeHash: process.env.SECRET_CODE_HASH ?? '',
  secretCodeSalt: process.env.SECRET_CODE_SALT ?? '',
  captchaSecret: process.env.CAPTCHA_SECRET ?? 'captcha-secret-change-me',
  sessionSecret: process.env.SESSION_SECRET ?? 'session-secret-change-me',
  wrongCodeRedirect: process.env.WRONG_CODE_REDIRECT ?? 'https://example.com',
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB ?? '20'),
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? '',
    region: process.env.S3_REGION ?? 'auto',
    bucket: process.env.S3_BUCKET ?? '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    publicUrl: process.env.S3_PUBLIC_URL ?? ''
  }
};

export const hasS3 = Boolean(env.s3.endpoint && env.s3.bucket && env.s3.accessKeyId && env.s3.secretAccessKey);
