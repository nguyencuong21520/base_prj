import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/modules/auth/api/auth.api';
import { tokenStore } from '@/modules/auth/store/token.store';
import { AvatarUpload } from '@/modules/profile/components/AvatarUpload';
import { ProfileEditForm } from '@/modules/profile/components/ProfileEditForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import type { CurrentUser } from '@/modules/auth/types/auth.types';

type ProfileUser = CurrentUser & {
  displayName?: string;
  bio?: string;
  phone?: string;
  avatarUrl?: string;
};

export const ProfilePage = () => {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const navigate = useNavigate();

  /**
   * Loads the current user and returns it, or `null` when the token is no longer
   * accepted (in which case the visitor is sent to the logout route).
   * It deliberately does not touch state, so callers decide when to store it.
   */
  const fetchUser = useCallback(async (): Promise<ProfileUser | null> => {
    try {
      const res = await authApi.getMe();
      return res.data as ProfileUser;
    } catch {
      tokenStore.clear();
      navigate('/logout');
      return null;
    }
  }, [navigate]);

  useEffect(() => {
    let active = true;

    void fetchUser().then((next) => {
      if (active && next) setUser(next);
    });

    // Guards against storing a response that arrives after unmount.
    return () => {
      active = false;
    };
  }, [fetchUser]);

  const reloadUser = () => {
    void fetchUser().then((next) => {
      if (next) setUser(next);
    });
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal information.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — avatar + email */}
        <Card className="flex flex-col items-center gap-4 p-6 lg:col-span-1">
          <AvatarUpload
            currentAvatarUrl={user?.avatarUrl}
            userInitials={initials}
            onUploadSuccess={(newUrl) => setUser((prev) => prev ? { ...prev, avatarUrl: newUrl } : prev)}
          />
          <div className="text-center">
            {user?.displayName && (
              <p className="font-semibold">{user.displayName}</p>
            )}
            <p className="text-sm text-muted-foreground">{user?.email ?? '—'}</p>
          </div>
        </Card>

        {/* Right column — edit form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <ProfileEditForm
                defaultValues={{
                  displayName: user.displayName ?? '',
                  bio: user.bio ?? '',
                  phone: user.phone ?? '',
                }}
                onSuccess={reloadUser}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
