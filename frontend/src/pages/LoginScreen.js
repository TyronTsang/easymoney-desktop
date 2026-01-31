import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { User, Lock, ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src={LOGO_URL} 
              alt="Easy Money Loans" 
              className="h-14 object-contain"
            />
          </div>
          <p className="text-muted-foreground mt-2 text-sm">Staff Portal</p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-heading flex items-center gap-2">
              <User className="w-5 h-5 text-red-500" strokeWidth={1.5} />
              Staff Login
            </CardTitle>
            <CardDescription>
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-secondary"
                    data-testid="login-username-input"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-secondary"
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

                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={lockApp}
                  data-testid="back-to-lock-btn"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Lock Screen
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Offline Desktop Application • Data is stored locally
        </p>
      </div>
    </div>
  );
}
