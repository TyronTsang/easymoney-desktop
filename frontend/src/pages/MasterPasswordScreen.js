import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Lock, KeyRound, AlertCircle, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_moneyloan/artifacts/5g3xucf8_easy_money_loans_logo_enhanced_white%20%281%29.png";

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
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)'
    }}>
      {/* Back link */}
      <a href="#" className="absolute top-6 left-6 text-white/90 hover:text-white flex items-center gap-2 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to website
      </a>

      <div className="w-full max-w-md">
        {/* Show default credentials after setup */}
        {defaultCredentials && (
          <Card className="shadow-2xl border-0">
            <CardContent className="pt-6">
              <Alert className="border-red-200 bg-red-50">
                <KeyRound className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-sm">
                  <p className="font-medium text-red-600 mb-2">Master password set! Default admin created:</p>
                  <div className="font-mono text-xs bg-gray-100 p-3 rounded-md space-y-1 text-gray-900">
                    <p>Username: <span className="text-red-600 font-semibold">{defaultCredentials.username}</span></p>
                    <p>Password: <span className="text-red-600 font-semibold">{defaultCredentials.password}</span></p>
                  </div>
                  <p className="mt-2 text-gray-500">Please change this password after first login.</p>
                  <Button 
                    onClick={handleContinueAfterSetup} 
                    className="w-full mt-4 bg-red-600 hover:bg-red-700"
                    disabled={loading}
                    data-testid="continue-after-setup-btn"
                  >
                    Continue to Login
                  </Button>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {!defaultCredentials && (
          <Card className="shadow-2xl border-0">
            <CardHeader className="text-center space-y-4 pt-8">
              {/* Logo */}
              <div className="flex items-center justify-center">
                <img 
                  src={LOGO_URL} 
                  alt="Easy Money Loans" 
                  className="h-12 object-contain"
                />
              </div>
              
              <div>
                <CardTitle className="text-2xl font-heading text-gray-900 flex items-center justify-center gap-2">
                  <Lock className="w-6 h-6 text-red-500" strokeWidth={1.5} />
                  {masterPasswordSet ? 'Unlock Application' : 'First-Time Setup'}
                </CardTitle>
                <CardDescription className="text-gray-500 mt-2">
                  {masterPasswordSet 
                    ? 'Enter the master password to access the application' 
                    : 'Create a master password to encrypt your data'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pb-8">
              <form onSubmit={masterPasswordSet ? handleUnlock : handleSetup}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700">Master Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter master password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 bg-gray-50 border-gray-200 focus:border-red-500 focus:ring-red-500"
                      data-testid="master-password-input"
                      required
                    />
                  </div>
                  
                  {!masterPasswordSet && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-700">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm master password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-12 bg-gray-50 border-gray-200 focus:border-red-500 focus:ring-red-500"
                        data-testid="confirm-password-input"
                        required
                      />
                    </div>
                  )}

                  {!masterPasswordSet && (
                    <Alert className="border-amber-200 bg-amber-50">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-xs text-amber-700">
                        This password encrypts all application data. If forgotten, data cannot be recovered.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium" 
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
        <p className="text-center text-xs text-white/70 mt-6">
          Offline Desktop Application • Version 1.0.0
        </p>
      </div>
    </div>
  );
}
