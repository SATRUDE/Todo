import { useState, useEffect, FormEvent } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";

interface SignInProps {
  onSignIn: () => void;
}

// Check if we're in development mode (localhost)
const isDevelopment = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname.includes('localhost');
};

export function SignIn({ onSignIn }: SignInProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const isDev = isDevelopment();

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          onSignIn();
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        onSignIn();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [onSignIn]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    if (!password.trim()) {
      setMessage({ type: 'error', text: 'Please enter your password' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          setMessage({ type: 'error', text: error.message });
        } else {
          // Check if email confirmation is required
          const needsConfirmation = data?.user && !data?.session;
          if (needsConfirmation) {
            setMessage({ 
              type: 'success', 
              text: 'Account created! Please check your email to confirm your account before signing in.' 
            });
          } else {
            setMessage({ 
              type: 'success', 
              text: 'Account created! You can now sign in.' 
            });
          }
          setIsSignUp(false);
          setPassword("");
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          // Provide more helpful error messages
          let errorMessage = error.message;
          if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
            errorMessage = 'Invalid email or password. If you signed up with a magic link, you need to set a password first. Use "Forgot password?" to set one.';
          }
          setMessage({ type: 'error', text: errorMessage });
        } else if (data?.user) {
          // Success - onAuthStateChange will handle calling onSignIn
          onSignIn();
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to authenticate' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-lg text-foreground">Loading...</p>
      </div>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">
            {isSignUp ? 'Create account' : 'Sign in to Todo'}
          </CardTitle>
          <CardDescription>
            {isSignUp ? 'Create an account to get started' : 'Enter your email and password'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {!isSignUp && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!email.trim()) {
                        setMessage({ type: 'error', text: 'Please enter your email address first' });
                        return;
                      }
                      setIsLoading(true);
                      setMessage(null);
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                          redirectTo: `${window.location.origin}/reset-password`,
                        });
                        if (error) {
                          setMessage({ type: 'error', text: error.message });
                        } else {
                          setMessage({ 
                            type: 'success', 
                            text: 'Password reset email sent! Check your inbox.' 
                          });
                        }
                      } catch (error: any) {
                        setMessage({ type: 'error', text: error.message || 'Failed to send reset email' });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                  >
                    Forgot password?
                  </Button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isLoading && email.trim() && password.trim()) {
                    handleSubmit(e as any);
                  }
                }}
              />
            </div>

            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full"
            >
              {isLoading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create account' : 'Sign in')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              type="button"
              variant="link"
              onClick={(e) => {
                e.preventDefault();
                setIsSignUp(!isSignUp);
                setMessage(null);
                setPassword("");
              }}
              disabled={isLoading}
              className="text-sm"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Button>
          </div>

          {isDev && (
            <div className="mt-6 pt-6 border-t space-y-3">
              <p className="text-xs text-center text-muted-foreground">
                Development Mode
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    const { error } = await supabase.auth.signInAnonymously();
                    if (error) {
                      setMessage({ type: 'error', text: error.message });
                    } else {
                      onSignIn();
                    }
                  } catch (error: any) {
                    setMessage({ type: 'error', text: error.message || 'Failed to sign in' });
                  }
                }}
                className="w-full"
              >
                Skip sign-in (dev only)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}

