/**
 * Records Cloudinary calls made through the mocked SDK so tests can assert
 * which public IDs were destroyed and how many uploads happened.
 */
export const cloudinaryRecorder = {
  uploads: [] as { folder: string; byteLength: number }[],
  destroyed: [] as string[],
  // Result returned by the mocked `upload_stream`; tests may override it.
  uploadResult: {
    secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1700000000/avatars/new-avatar.png',
    public_id: 'avatars/new-avatar'
  },
  // When set, the mocked `destroy` rejects with this error.
  destroyError: null as Error | null,
  reset() {
    this.uploads = [];
    this.destroyed = [];
    this.destroyError = null;
  }
};
