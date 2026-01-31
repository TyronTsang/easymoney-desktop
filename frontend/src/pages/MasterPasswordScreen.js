import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Lock, Shield, KeyRound, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

export default function MasterPasswordScreen() {
  const { masterPasswordSet, setupMasterPassword, unlockApp } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [defaultCredentials, setDefaultCredentials] = useState(null);

  const handleSetup = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      const result = await setupMasterPassword(password);
      setDefaultCredentials(result.default_admin);
      toast.success('Master password set successfully');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to set master password');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const success = await unlockApp(password);
      if (success) {
        toast.success('App unlocked');
      } else {
        toast.error('Invalid master password');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to unlock');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAfterSetup = async () => {
    setLoading(true);
    try {
      await unlockApp(password);
      toast.success('App unlocked');
    } catch (err) {
      toast.error('Failed to unlock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Shield className="w-8 h-8 text-emerald-500" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground tracking-tight">
            EasyMoneyLoans
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Secure Desktop Application</p>
        </div>

        {/* Show default credentials after setup */}
        {defaultCredentials && (
          <Alert className="mb-6 border-emerald-500/20 bg-emerald-500/10">
            <KeyRound className="h-4 w-4 text-emerald-500" />
            <AlertDescription className="text-sm">
              <p className="font-medium text-emerald-500 mb-2">Master password set! Default admin created:</p>
              <div className="font-mono text-xs bg-black/30 p-3 rounded-md space-y-1">
                <p>Username: <span className="text-emerald-400">{defaultCredentials.username}</span></p>
                <p>Password: <span className="text-emerald-400">{defaultCredentials.password}</span></p>
              </div>
              <p className="mt-2 text-muted-foreground">Please change this password after first login.</p>
              <Button 
                onClick={handleContinueAfterSetup} 
                className="w-full mt-4"
                disabled={loading}
                data-testid="continue-after-setup-btn"
              >
                Continue to Login
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!defaultCredentials && (
          <Card className="border-border bg-card">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl font-heading flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
                {masterPasswordSet ? 'Unlock Application' : 'First-Time Setup'}
              </CardTitle>
              <CardDescription>
                {masterPasswordSet 
                  ? 'Enter the master password to access the application' 
                  : 'Create a master password to encrypt your data'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={masterPasswordSet ? handleUnlock : handleSetup}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Master Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter master password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-secondary"
                      data-testid="master-password-input"
                      required
                    />
                  </div>
                  
                  {!masterPasswordSet && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm master password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-secondary"
                        data-testid="confirm-password-input"
                        required
                      />
                    </div>
                  )}

                  {!masterPasswordSet && (
                    <Alert className="border-amber-500/20 bg-amber-500/10">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <AlertDescription className="text-xs text-amber-200/80">
                        This password encrypts all application data. If forgotten, data cannot be recovered.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                    data-testid="master-password-submit"
                  >
                    {loading ? 'Processing...' : masterPasswordSet ? 'Unlock' : 'Set Master Password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Offline Desktop Application • Version 1.0.0
        </p>
      </div>
    </div>
  );
}
