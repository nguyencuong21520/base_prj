import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/app';
import { UserModel } from '../../src/models/user.model';
import { cloudinaryRecorder } from '../helpers/cloudinary-recorder';
import { bearerFor, createUser } from '../helpers/user-factory';

const SECRET_FIELDS = [
  'password',
  'otpCode',
  'otpExpiresAt',
  'resetToken',
  'resetTokenExpiresAt'
];

const pngBuffer = (byteLength = 64) => Buffer.alloc(byteLength, 1);

describe('PATCH /api/profile', () => {
  it('updates the editable fields and hides every secret field', async () => {
    const user = await createUser({});

    const response = await request(app)
      .patch('/api/profile')
      .set('Authorization', bearerFor(user))
      .send({ displayName: 'Alice', bio: 'Hello', phone: '0123456789' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ displayName: 'Alice', bio: 'Hello', phone: '0123456789' });
    for (const field of SECRET_FIELDS) {
      expect(response.body).not.toHaveProperty(field);
    }
  });

  it('trims the stored values', async () => {
    const user = await createUser({});

    const response = await request(app)
      .patch('/api/profile')
      .set('Authorization', bearerFor(user))
      .send({ displayName: '  Alice  ' });

    expect(response.body.displayName).toBe('Alice');
  });

  it('requires authentication', async () => {
    const response = await request(app).patch('/api/profile').send({ displayName: 'Alice' });
    expect(response.status).toBe(401);
  });

  it('rejects invalid values with 400', async () => {
    const user = await createUser({});

    const response = await request(app)
      .patch('/api/profile')
      .set('Authorization', bearerFor(user))
      .send({ bio: 'b'.repeat(201) });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].field).toBe('bio');
  });

  it('returns 404 when the authenticated user no longer exists', async () => {
    const user = await createUser({});
    const authorization = bearerFor(user);
    await UserModel.deleteOne({ _id: user._id });

    const response = await request(app)
      .patch('/api/profile')
      .set('Authorization', authorization)
      .send({ displayName: 'Alice' });

    expect(response.status).toBe(404);
  });
});

describe('POST /api/profile/avatar', () => {
  it('uploads the image and persists the returned URL', async () => {
    const user = await createUser({});

    const response = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', bearerFor(user))
      .attach('avatar', pngBuffer(), { filename: 'avatar.png', contentType: 'image/png' });

    expect(response.status).toBe(200);
    expect(response.body.avatarUrl).toBe(cloudinaryRecorder.uploadResult.secure_url);
    expect(cloudinaryRecorder.uploads).toEqual([{ folder: 'avatars', byteLength: 64 }]);
    expect((await UserModel.findById(user._id))?.avatarUrl).toBe(
      cloudinaryRecorder.uploadResult.secure_url
    );
    for (const field of SECRET_FIELDS) {
      expect(response.body.user).not.toHaveProperty(field);
    }
  });

  it('deletes the previous avatar, deriving its public id from the stored URL', async () => {
    const user = await createUser({
      avatarUrl: 'https://res.cloudinary.com/test-cloud/image/upload/v1700000000/avatars/old-avatar.png'
    });

    await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', bearerFor(user))
      .attach('avatar', pngBuffer(), { filename: 'avatar.png', contentType: 'image/png' });

    expect(cloudinaryRecorder.destroyed).toEqual(['avatars/old-avatar']);
  });

  it('does not call delete when the user has no avatar yet', async () => {
    const user = await createUser({});

    await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', bearerFor(user))
      .attach('avatar', pngBuffer(), { filename: 'avatar.png', contentType: 'image/png' });

    expect(cloudinaryRecorder.destroyed).toEqual([]);
  });

  it('still succeeds when deleting the previous avatar fails', async () => {
    cloudinaryRecorder.destroyError = new Error('cloudinary down');
    const user = await createUser({
      avatarUrl: 'https://res.cloudinary.com/test-cloud/image/upload/v1/avatars/old-avatar.png'
    });

    const response = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', bearerFor(user))
      .attach('avatar', pngBuffer(), { filename: 'avatar.png', contentType: 'image/png' });

    expect(response.status).toBe(200);
    expect(response.body.avatarUrl).toBe(cloudinaryRecorder.uploadResult.secure_url);
  });

  it('answers 400 when no file is attached', async () => {
    const user = await createUser({});

    const response = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', bearerFor(user));

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('No file provided');
  });

  it('requires authentication and never reaches Cloudinary', async () => {
    const response = await request(app)
      .post('/api/profile/avatar')
      .attach('avatar', pngBuffer(), { filename: 'avatar.png', contentType: 'image/png' });

    expect(response.status).toBe(401);
    expect(cloudinaryRecorder.uploads).toEqual([]);
  });

  // The multer filter rejects the file, so nothing must be uploaded. The status is
  // currently 500 because `errorMiddleware` maps every error to 500; the assertion
  // only pins "request failed, no upload" so a future 400 mapping stays green.
  it('rejects a non-image file without uploading it', async () => {
    const user = await createUser({});

    const response = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', bearerFor(user))
      .attach('avatar', Buffer.from('%PDF-1.4'), {
        filename: 'doc.pdf',
        contentType: 'application/pdf'
      });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(cloudinaryRecorder.uploads).toEqual([]);
  });

  it('rejects a file larger than 5 MB without uploading it', async () => {
    const user = await createUser({});

    const response = await request(app)
      .post('/api/profile/avatar')
      .set('Authorization', bearerFor(user))
      .attach('avatar', pngBuffer(6 * 1024 * 1024), {
        filename: 'huge.png',
        contentType: 'image/png'
      });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(cloudinaryRecorder.uploads).toEqual([]);
  });
});

describe('smoke endpoints', () => {
  it('exposes a health check', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('exposes the root welcome message', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Welcome to the API' });
  });
});
