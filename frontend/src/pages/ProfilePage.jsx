import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { useForm } from '../hooks/useForm';
import api from '../api/client';
import {
  User,
  Mail,
  Lock,
  Upload,
  Camera,
  CheckCircle,
  AlertCircle,
  Shield,
  Calendar,
  ShoppingBag,
  CreditCard,
  Trash2,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

export const ProfilePage = () => {
  const { user, updateUser, logout } = useAuth();
  const { showToast } = useToast();

  // Avatar Upload States
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Stats State (Bonus)
  const [stats, setStats] = useState({ created_at: null, total_orders: 0, total_spent: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  // Delete Account Modal State (Bonus)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Password visibility toggles
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Form hooks
  const profileForm = useForm({
    name: user?.name || '',
    email: user?.email || '',
  });

  const passwordForm = useForm({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Sync form values when user context changes
  useEffect(() => {
    if (user) {
      profileForm.setValues({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // Fetch account activity stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const res = await api.get('/api/me/stats');
        setStats(res.data);
      } catch (err) {
        console.warn('Failed to load user stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };
    if (user) {
      fetchStats();
    }
  }, [user]);

  // Handle avatar file selection & instant preview
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      showToast('Invalid file format. Please upload PNG, JPG, or WEBP.', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('File size exceeds 2MB limit.', 'error');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleCancelPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('image', selectedFile);

    setUploading(true);
    try {
      const res = await api.put('/api/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const updatedAvatarUrl = res.data.avatar_url;
      updateUser({ avatar_url: updatedAvatarUrl });
      showToast(res.data.message || 'Profile picture updated successfully!', 'success');
      handleCancelPreview();
    } catch (err) {
      console.error('Avatar upload error:', err);
      const errMsg = err.response?.data?.error || 'Failed to upload profile picture.';
      showToast(errMsg, 'error');
    } finally {
      setUploading(false);
    }
  };

  const [removingAvatar, setRemovingAvatar] = useState(false);

  const handleRemoveAvatar = async () => {
    setRemovingAvatar(true);
    try {
      const res = await api.delete('/api/me/avatar');
      updateUser({ avatar_url: null });
      handleCancelPreview();
      showToast(res.data.message || 'Profile picture removed. Initials avatar restored!', 'info');
    } catch (err) {
      console.error('Remove avatar error:', err);
      showToast(err.response?.data?.error || 'Failed to remove profile picture.', 'error');
    } finally {
      setRemovingAvatar(false);
    }
  };

  // Handle Section 2: Edit Profile submit
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    profileForm.clearErrors();

    const name = profileForm.values.name.trim();
    const email = profileForm.values.email.trim();

    if (!name) {
      profileForm.setFieldError('name', 'Name is required');
      return;
    }
    if (!email) {
      profileForm.setFieldError('email', 'Email is required');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.put('/api/me', { name, email });
      updateUser({ name: res.data.user.name, email: res.data.user.email });
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      if (err.response?.status === 409) {
        // Show inline error for duplicate email (NOT toast)
        profileForm.setFieldError('email', 'Email is already in use by another account');
      } else {
        showToast(err.response?.data?.error || 'Failed to update profile', 'error');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Section 3: Change Password submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    passwordForm.clearErrors();

    const { current_password, new_password, confirm_password } = passwordForm.values;

    let hasError = false;
    if (!current_password) {
      passwordForm.setFieldError('current_password', 'Current password is required');
      hasError = true;
    }
    if (new_password.length < 6) {
      passwordForm.setFieldError('new_password', 'Minimum 6 characters required');
      hasError = true;
    }
    if (new_password !== confirm_password) {
      passwordForm.setFieldError('confirm_password', 'Passwords do not match');
      hasError = true;
    }

    if (hasError) return;

    setChangingPassword(true);
    try {
      const res = await api.put('/api/me/password', {
        current_password,
        new_password,
        confirm_password,
      });

      showToast(res.data.message || 'Password changed successfully!', 'success');
      passwordForm.resetForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      if (err.response?.status === 401) {
        // Show inline error under current_password field
        passwordForm.setFieldError('current_password', 'Current password is incorrect');
      } else {
        const msg = err.response?.data?.error || 'Failed to change password.';
        showToast(msg, 'error');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // Bonus: Handle Delete Account
  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await api.delete('/api/me');
      showToast('Account deleted successfully.', 'info');
      logout();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete account.', 'error');
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  // Initials generator
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Password Strength Indicator
  const getPasswordStrength = (pass) => {
    if (!pass) return { label: '', score: 0, color: '#e2e8f0' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { label: 'Weak', score: 20, color: '#ef4444' };
    if (score <= 3) return { label: 'Medium', score: 60, color: '#f59e0b' };
    return { label: 'Strong', score: 100, color: '#10b981' };
  };

  const passwordStrength = getPasswordStrength(passwordForm.values.new_password);

  // Format created_at date
  const formatMemberSince = (dateStr) => {
    if (!dateStr) return 'Jan 2025';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return 'Jan 2025';
    }
  };

  const currentAvatar = previewUrl || user?.avatar_url;

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '24px 16px 60px',
        color: 'var(--text-primary)',
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          padding: '28px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Avatar / Initials display */}
          <div style={{ position: 'relative' }}>
            {currentAvatar ? (
              <img
                src={currentAvatar.startsWith('/') ? currentAvatar : `/${currentAvatar}`}
                alt={user?.name || 'User Avatar'}
                style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--accent-primary)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: '50%',
                  background: 'var(--accent-gradient)',
                  color: '#ffffff',
                  fontSize: '32px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  letterSpacing: '1px',
                }}
              >
                {getInitials(user?.name)}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Change Profile Photo"
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--accent-primary)',
                color: '#ffffff',
                border: '2px solid var(--bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Camera size={16} />
            </button>
          </div>

          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px', color: 'var(--text-primary)' }}>
              {user?.name || 'User Profile'}
            </h2>
            <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={15} /> {user?.email}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: user?.role === 'admin' ? '#ef4444' : 'var(--accent-primary)',
                  color: '#ffffff',
                }}
              >
                {user?.role || 'Customer'}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={14} /> Member since {formatMemberSince(stats.created_at || user?.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Stats summary badge (Bonus) */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            background: 'var(--bg-surface-elevated)',
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ textAlign: 'center', paddingRight: '12px', borderRight: '1px solid var(--border-color)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <ShoppingBag size={14} /> Orders
            </span>
            <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
              {stats.total_orders}
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <CreditCard size={14} /> Total Spent
            </span>
            <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-primary)' }}>
              ${stats.total_spent.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* SECTION 1: PROFILE PICTURE UPLOAD */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(79, 70, 229, 0.1)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Section 1 — Profile Picture
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                Upload a photo to personalize your account avatar across the platform.
              </p>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/png, image/jpeg, image/jpg, image/webp"
            style={{ display: 'none' }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              padding: '16px',
              background: 'var(--bg-surface-elevated)',
              borderRadius: '12px',
              border: '1px dashed var(--border-color)',
            }}
          >
            {/* Avatar display/preview */}
            <div style={{ position: 'relative' }}>
              {currentAvatar ? (
                <img
                  src={currentAvatar.startsWith('/') ? currentAvatar : `/${currentAvatar}`}
                  alt="Avatar Preview"
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--accent-primary)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--accent-gradient)',
                    color: '#ffffff',
                    fontSize: '22px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {getInitials(user?.name)}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              {previewUrl ? (
                <div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent-primary)', display: 'block' }}>
                    New Image Selected ({selectedFile?.name})
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Click "Upload Photo" to save your new profile picture.
                  </span>
                </div>
              ) : (
                <div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', display: 'block' }}>
                    Current Profile Picture
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    PNG, JPG or WEBP. Max size 2 MB.
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Upload size={15} /> Change Photo
              </button>

              {user?.avatar_url && !previewUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={removingAvatar}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #fee2e2',
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: removingAvatar ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Trash2 size={15} /> {removingAvatar ? 'Removing...' : 'Remove Photo'}
                </button>
              )}

              {previewUrl && (
                <>
                  <button
                    type="button"
                    onClick={handleUploadAvatar}
                    disabled={uploading}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--accent-primary)',
                      color: '#ffffff',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: 'var(--shadow-glow)',
                    }}
                  >
                    <CheckCircle size={15} /> {uploading ? 'Uploading...' : 'Upload Photo'}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelPreview}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: EDIT PROFILE */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(79, 70, 229, 0.1)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Section 2 — Edit Profile
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                Update your personal details. Changes will be reflected across your account immediately.
              </p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              {/* Full Name Field */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    type="text"
                    name="name"
                    value={profileForm.values.name}
                    onChange={profileForm.handleChange}
                    placeholder="Enter your full name"
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      borderRadius: '8px',
                      border: profileForm.errors.name ? '1px solid #ef4444' : '1px solid var(--border-color)',
                      background: 'var(--bg-surface-elevated)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                {profileForm.errors.name && (
                  <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={13} /> {profileForm.errors.name}
                  </span>
                )}
              </div>

              {/* Email Address Field */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    type="email"
                    name="email"
                    value={profileForm.values.email}
                    onChange={profileForm.handleChange}
                    placeholder="name@example.com"
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      borderRadius: '8px',
                      border: profileForm.errors.email ? '2px solid #ef4444' : '1px solid var(--border-color)',
                      background: 'var(--bg-surface-elevated)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                {/* Inline Error for taken email */}
                {profileForm.errors.email && (
                  <span
                    id="email-inline-error"
                    style={{
                      fontSize: '12px',
                      color: '#ef4444',
                      fontWeight: '600',
                      marginTop: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    <AlertCircle size={13} /> {profileForm.errors.email}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={savingProfile}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--accent-primary)',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: savingProfile ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--shadow-glow)',
                }}
              >
                {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 3: CHANGE PASSWORD */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(79, 70, 229, 0.1)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                Section 3 — Change Password
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                Ensure your account is using a strong password. Current password verification required.
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} noValidate>
            {/* Current Password Field */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
                Current Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  name="current_password"
                  value={passwordForm.values.current_password}
                  onChange={passwordForm.handleChange}
                  placeholder="Enter current password"
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 38px',
                    borderRadius: '8px',
                    border: passwordForm.errors.current_password ? '2px solid #ef4444' : '1px solid var(--border-color)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Inline Error for wrong current password */}
              {passwordForm.errors.current_password && (
                <span
                  id="current-password-inline-error"
                  style={{
                    fontSize: '12px',
                    color: '#ef4444',
                    fontWeight: '600',
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                  }}
                >
                  <AlertCircle size={13} /> {passwordForm.errors.current_password}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              {/* New Password Field */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    name="new_password"
                    value={passwordForm.values.new_password}
                    onChange={passwordForm.handleChange}
                    placeholder="Min 6 characters"
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 38px',
                      borderRadius: '8px',
                      border: passwordForm.errors.new_password ? '1px solid #ef4444' : '1px solid var(--border-color)',
                      background: 'var(--bg-surface-elevated)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password strength bar indicator */}
                {passwordForm.values.new_password && (
                  <div style={{ marginTop: '6px' }}>
                    <div
                      style={{
                        height: '4px',
                        borderRadius: '2px',
                        background: '#e2e8f0',
                        overflow: 'hidden',
                        marginBottom: '4px',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${passwordStrength.score}%`,
                          background: passwordStrength.color,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: passwordStrength.color }}>
                      Strength: {passwordStrength.label}
                    </span>
                  </div>
                )}

                {passwordForm.errors.new_password && (
                  <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={13} /> {passwordForm.errors.new_password}
                  </span>
                )}
              </div>

              {/* Confirm New Password Field */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    name="confirm_password"
                    value={passwordForm.values.confirm_password}
                    onChange={passwordForm.handleChange}
                    placeholder="Re-enter new password"
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 38px',
                      borderRadius: '8px',
                      border: passwordForm.errors.confirm_password ? '1px solid #ef4444' : '1px solid var(--border-color)',
                      background: 'var(--bg-surface-elevated)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordForm.errors.confirm_password && (
                  <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={13} /> {passwordForm.errors.confirm_password}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={changingPassword}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--accent-primary)',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: changingPassword ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--shadow-glow)',
                }}
              >
                {changingPassword ? 'Updating Password...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>

        {/* BONUS SECTION: ACCOUNT MANAGEMENT & DELETE ACCOUNT */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: '16px',
            border: '1px solid #fee2e2',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', width: '100%' }}>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#dc2626', margin: '0 0 4px' }}>
                Danger Zone
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                Permanently remove your account profile and order history.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #fca5a5',
                background: '#fef2f2',
                color: '#dc2626',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Trash2 size={15} /> Delete Account
            </button>
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal (Bonus) */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              maxWidth: '450px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#fef2f2',
                  color: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <Trash2 size={28} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 6px', color: 'var(--text-primary)' }}>
                Delete Account Confirmation
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                Are you sure you want to delete your account? This action is permanent and cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingAccount}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-surface-elevated)',
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: deletingAccount ? 'not-allowed' : 'pointer',
                }}
              >
                {deletingAccount ? 'Deleting...' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;
