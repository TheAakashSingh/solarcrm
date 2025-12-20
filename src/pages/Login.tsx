import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sun, Mail, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { usersAPI } from '@/lib/api';

export default function Login() {
  const navigate = useNavigate();
  const { loginWithEmail, currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState<any[]>([]);

  // Fetch demo users for quick login
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await usersAPI.getAll();
        if (response.success && response.data) {
          setDemoUsers(Array.isArray(response.data) ? response.data.slice(0, 3) : []);
        } else if (!response.success && response.message?.includes('Could not connect')) {
          // Backend not running - silently fail, user can still login manually
          console.warn('Backend not available - demo users not loaded');
        }
      } catch (error) {
        // Silently fail - backend might not be running yet
        console.warn('Failed to fetch users (backend may not be running):', error);
      }
    };
    fetchUsers();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    if (!password.trim()) {
      toast.error('Please enter your password');
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await loginWithEmail(email, password);
      if (success) {
        toast.success(`Welcome back, ${currentUser?.name || 'User'}!`);
        navigate('/');
      } else {
        toast.error('Invalid email or password');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img 
              src="/sunshellconnect.png" 
              alt="SUNSHELL Connect" 
              className="h-20 w-auto object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">SolarSync CRM</CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <p className="text-xs text-blue-800">
                <strong>Default Password:</strong> password123 (for all demo users)
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {demoUsers.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-center text-muted-foreground mb-3">
                Quick Login:
              </p>
              <div className="space-y-2">
                {demoUsers.map((user) => (
                  <Button
                    key={user.id}
                    variant="outline"
                    className="w-full justify-start text-sm"
                    onClick={() => {
                      setEmail(user.email);
                      setPassword('password123');
                    }}
                    disabled={isLoading}
                  >
                    <Mail className="h-3 w-3 mr-2" />
                    {user.email} ({user.role})
                  </Button>
                ))}
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Default password: password123
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

