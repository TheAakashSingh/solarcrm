import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { User, Camera, Mail, Save, X } from 'lucide-react';

export default function Profile() {
  const { currentUser, setCurrentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        avatar: currentUser.avatar || '',
      });
      setAvatarPreview(currentUser.avatar || '');
    }
  }, [currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setAvatarFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    setFormData(prev => ({ ...prev, avatar: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('User not found');
      return;
    }

    setSaving(true);
    try {
      // If avatar file is selected, convert to base64 for now (in production, upload to cloud storage)
      let avatarUrl = formData.avatar;
      
      if (avatarFile) {
        // Convert file to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64String = reader.result as string;
            avatarUrl = base64String;

            // Update user with avatar
            const updateData = {
              name: formData.name,
              email: formData.email,
              avatar: avatarUrl,
            };

            const response = await usersAPI.update(currentUser.id, updateData);
            
            if (response.success) {
              // Update current user in context
              setCurrentUser(response.data);
              toast.success('Profile updated successfully');
            } else {
              toast.error(response.message || 'Failed to update profile');
            }
          } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
          } finally {
            setSaving(false);
          }
        };
        reader.readAsDataURL(avatarFile);
      } else {
        // No new avatar file, just update other fields
        const updateData = {
          name: formData.name,
          email: formData.email,
          avatar: avatarUrl,
        };

        const response = await usersAPI.update(currentUser.id, updateData);
        
        if (response.success) {
          setCurrentUser(response.data);
          toast.success('Profile updated successfully');
        } else {
          toast.error(response.message || 'Failed to update profile');
        }
        setSaving(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <MainLayout>
      <Header 
        title="My Profile"
        subtitle="Manage your profile information"
        showNewEnquiry={false}
      />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Profile Header Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your profile details. Changes will be reflected across the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 pb-6 border-b">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarPreview} alt={formData.name} />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                      {getInitials(formData.name)}
                    </AvatarFallback>
                  </Avatar>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={removeAvatar}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <div className="flex-1 space-y-2">
                  <Label htmlFor="avatar" className="cursor-pointer">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Camera className="h-4 w-4" />
                      Change Profile Photo
                    </div>
                  </Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-500">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                  {avatarPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeAvatar}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Remove Photo
                    </Button>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      Full Name
                    </div>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      Email Address
                    </div>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              {/* Role Display (Read-only) */}
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                  <span className="text-sm font-medium capitalize text-gray-700">
                    {currentUser?.role || 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Role cannot be changed. Contact your administrator for role changes.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    // Reset form
                    if (currentUser) {
                      setFormData({
                        name: currentUser.name || '',
                        email: currentUser.email || '',
                        avatar: currentUser.avatar || '',
                      });
                      setAvatarPreview(currentUser.avatar || '');
                      setAvatarFile(null);
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Additional Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Additional account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">User ID</span>
              <span className="text-sm font-mono text-gray-900">{currentUser?.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t">
              <span className="text-sm text-gray-600">Member Since</span>
              <span className="text-sm text-gray-900">
                {currentUser?.createdAt 
                  ? new Date(currentUser.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'N/A'
                }
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

