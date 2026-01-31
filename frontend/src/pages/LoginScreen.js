import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Lock, ArrowLeft } from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_secureloans-desk/artifacts/2f2hs30o_easy_money_loans_logo_enhanced_white%20%281%29.png";

export default function LoginScreen() {
  const { login, lockApp } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Login successful');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials');
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
              Staff Portal
            </CardTitle>
            <CardDescription className="text-gray-600">
              Sign in to access the loan management system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-700">Email</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="staff@easymoneyloans.co.za"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-gray-50 border-gray-200 focus:border-red-500 focus:ring-red-500"
                    data-testid="login-username-input"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-gray-50 border-gray-200 focus:border-red-500 focus:ring-red-500"
                    data-testid="login-password-input"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-red-600 hover:bg-red-700" 
                  disabled={loading}
                  data-testid="login-submit-btn"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </div>
            </form>

            <p className="text-center text-xs text-gray-500 mt-6 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              This portal is for authorized staff only
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
