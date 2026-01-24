import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const { loginWithEmail, currentUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) navigate('/');
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }

    setLoading(true);
    const success = await loginWithEmail(email, password);
    setLoading(false);

    success ? navigate('/') : toast.error('Invalid credentials');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4">
      <Card className="w-full max-w-md border border-[#E5E7EB] shadow-lg rounded-xl">
        <CardContent className="p-8 space-y-6">
          {/* Logo */}
          <div className="text-center space-y-2">
            <img
              src="/sunshellconnect.png"
              alt="SunshellConnect"
              className="h-14 mx-auto"
            />
            <h1 className="text-2xl font-semibold text-[#1F2937]">
              Sign in to SunshellConnect
            </h1>
            <p className="text-sm text-[#6B7280]">
              Access your CRM dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1">
              <Label className="text-sm text-[#374151]">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-[#9CA3AF]" />
                <Input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 border-[#E5E7EB] focus:ring-2 focus:ring-[#0B5ED7]"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <Label className="text-sm text-[#374151]">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-[#9CA3AF]" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10 border-[#E5E7EB] focus:ring-2 focus:ring-[#0B5ED7]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#6B7280]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot */}
            <div className="text-right text-sm">
              <a href="/forgot-password" className="text-[#0B5ED7] hover:underline">
                Forgot password?
              </a>
            </div>

            {/* Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0B5ED7] hover:bg-[#094DB1] text-white rounded-lg text-base"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-xs text-center text-[#9CA3AF]">
            © {new Date().getFullYear()} SunshellConnect. All rights reserved.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
