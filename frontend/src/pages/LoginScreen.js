import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Lock, ArrowLeft } from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_moneyloan/artifacts/5g3xucf8_easy_money_loans_logo_enhanced_white%20%281%29.png";

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }
    
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Login successful');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)'
    }}>
      {/* Back to website link */}
      <a href="#" className="absolute top-6 left-6 text-white/90 hover:text-white flex items-center gap-2 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to website
      </a>

      <Card className="w-full max-w-md shadow-2xl border-0">
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
            <CardTitle className="text-2xl font-heading text-gray-900">Staff Portal</CardTitle>
            <CardDescription className="text-gray-500 mt-2">
              Sign in to access the loan management system
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <Input
                id="email"
                type="text"
                placeholder="staff@easymoneyloans.co.za"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 bg-gray-50 border-gray-200 focus:border-red-500 focus:ring-red-500"
                data-testid="login-username"
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
                className="h-12 bg-gray-50 border-gray-200 focus:border-red-500 focus:ring-red-500"
                data-testid="login-password"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium text-base"
              data-testid="login-submit"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />
              This portal is for authorized staff only
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
