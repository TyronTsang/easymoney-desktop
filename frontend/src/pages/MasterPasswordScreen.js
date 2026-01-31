import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_secureloans-desk/artifacts/2f2hs30o_easy_money_loans_logo_enhanced_white%20%281%29.png";

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
    <div className="min-h-screen bg-red-gradient flex items-center justify-center p-4">
      {/* Back to website link */}
      <a 
        href="#" 
        className="absolute top-6 left-6 text-white/90 hover:text-white flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to website
      </a>

      <div className="w-full max-w-md">
        {/* Show default credentials after setup */}
        {defaultCredentials && (
          <Card className="mb-6 border-0 shadow-xl">
            <CardContent className="pt-6">
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-heading font-bold text-lg text-gray-900">Master Password Set!</h3>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Default admin credentials:</p>
                <div className="font-mono text-sm space-y-1">
                  <p>Username: <span className="font-semibold text-gray-900">{defaultCredentials.username}</span></p>
                  <p>Password: <span className="font-semibold text-gray-900">{defaultCredentials.password}</span></p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4">Please change this password after first login.</p>
              <Button 
                onClick={handleContinueAfterSetup} 
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={loading}
                data-testid="continue-after-setup-btn"
              >
                Continue to Login
              </Button>
            </CardContent>
          </Card>
        )}

        {!defaultCredentials && (
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              {/* Logo */}
              <div className="flex justify-center mb-4">
                <img 
                  src={LOGO_URL} 
                  alt="Easy Money Loans" 
                  className="h-12 object-contain"
                />
              </div>
              <CardTitle className="text-2xl font-heading font-bold text-gray-900">
                {masterPasswordSet ? 'Staff Portal' : 'First-Time Setup'}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {masterPasswordSet 
                  ? 'Enter the master password to access the application' 
                  : 'Create a master password to encrypt your data'}
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      className="bg-gray-50 border-gray-200 focus:border-red-500 focus:ring-red-500"
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
                        className="bg-gray-50 border-gray-200 focus:border-red-500 focus:ring-red-500"
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
                    className="w-full bg-red-600 hover:bg-red-700" 
                    disabled={loading}
                    data-testid="master-password-submit"
                  >
                    {loading ? 'Processing...' : masterPasswordSet ? 'Sign In' : 'Set Master Password'}
                  </Button>
                </div>
              </form>

              <p className="text-center text-xs text-gray-500 mt-6 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" />
                This portal is for authorized staff only
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
