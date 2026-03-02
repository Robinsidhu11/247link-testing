import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Redirect = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    if (!shortCode) {
      setError('Short code is missing.');
      return;
    }

    // For /s/ routes — server already handled redirect via /api/s/
    // React only reaches here for:
    // 1. Password protected links → /password/:shortCode page handles this
    // 2. Direct /:shortCode routes not caught by vercel.json
    // So just forward to server route and let it handle
    window.location.replace(`/api/s/${shortCode}`);

  }, [shortCode]);

  // Password form handler
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    try {
      const trackResult = await supabase.functions.invoke('track-click', {
        body: { code: shortCode, password: password },
        headers: {
          'user-agent': navigator.userAgent,
          'referer': document.referrer,
        }
      });

      if (trackResult.data?.url) {
        window.location.replace(trackResult.data.url);
        return;
      }

      if (trackResult.data?.error) {
        setPasswordError(trackResult.data.error);
        return;
      }

      setPasswordError('Invalid response from server.');

    } catch (error: any) {
      setPasswordError('Failed to verify password. Please try again.');
    }
  };

  // Password form
  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Password Protected Link</CardTitle>
            <CardDescription>
              This link is password protected. Please enter the password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4 text-center p-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <a href="/" className="text-primary hover:underline">Go to homepage</a>
        </div>
      </div>
    );
  }

  // Show nothing while server handles redirect
  return null;
};

export default Redirect;