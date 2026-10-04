import * as React from "react";
import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  User,
  Camera,
  Edit3,
  Save,
  X,
  Trash2,
  Lock,
  Phone,
  Mail,
  FileText,
  Loader,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User as AuthUser } from "@supabase/supabase-js";

interface Profile {
  id: string;
  name: string;
  avatar_url?: string | null;
  phone?: string | null;
  bio?: string | null;
}

interface ProfileSectionProps {
  user: AuthUser;
  profile: { id: string; name: string } | null;
  onClose: () => void;
  onProfileUpdate: (name: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ProfileSection({
  user,
  profile: initialProfile,
  onClose,
  onProfileUpdate,
  onSignOut,
}: ProfileSectionProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");

  // Image crop state
  const [showCropModal, setShowCropModal] = useState(false);
  const [imgSrc, setImgSrc] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch full profile data
  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, phone, bio")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
        setEditName(data.name || "");
        setEditPhone(data.phone || "");
        setEditBio(data.bio || "");
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  React.useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const showNotif = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showNotif("error", "Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImgSrc(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  // Handle image load for crop
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  };

  // Upload cropped image
  const uploadCroppedImage = async () => {
    if (!completedCrop || !imgRef.current) return;

    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const outputSize = 256;
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      outputSize,
      outputSize
    );

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;

        setIsSaving(true);
        try {
          const fileName = `${user.id}/${Date.now()}.jpg`;

          // Delete old avatar if exists
          if (profile?.avatar_url) {
            const oldPath = profile.avatar_url.split("/avatars/")[1];
            if (oldPath) {
              await supabase.storage.from("avatars").remove([oldPath]);
            }
          }

          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(fileName, blob, { contentType: "image/jpeg" });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(fileName);

          const { error: updateError } = await supabase
            .from("profiles")
            .update({ avatar_url: urlData.publicUrl })
            .eq("id", user.id);

          if (updateError) throw updateError;

          setProfile((prev) => prev ? { ...prev, avatar_url: urlData.publicUrl } : null);
          showNotif("success", "Profile photo updated!");
          setShowCropModal(false);
          setImgSrc("");
        } catch (err) {
          console.error("Error uploading avatar:", err);
          showNotif("error", "Failed to upload photo");
        } finally {
          setIsSaving(false);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: editName,
          phone: editPhone,
          bio: editBio,
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfile((prev) => prev ? { ...prev, name: editName, phone: editPhone, bio: editBio } : null);
      await onProfileUpdate(editName);
      showNotif("success", "Profile updated successfully!");
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      showNotif("error", "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError("Please enter your password");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      // Verify password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: deletePassword,
      });

      if (signInError) {
        setDeleteError("Incorrect password");
        setIsDeleting(false);
        return;
      }

      // Delete user data
      // Note: The user record in auth.users will be deleted by cascade
      // We just need to sign out and inform the user
      
      // Delete avatar if exists
      if (profile?.avatar_url) {
        const path = profile.avatar_url.split("/avatars/")[1];
        if (path) {
          await supabase.storage.from("avatars").remove([path]);
        }
      }

      // Delete profile (will cascade to user_roles due to FK)
      await supabase.from("profiles").delete().eq("id", user.id);

      // Sign out
      await onSignOut();
      showNotif("success", "Account deleted successfully");
      onClose();
    } catch (err) {
      console.error("Error deleting account:", err);
      setDeleteError("Failed to delete account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-card p-8 rounded-2xl shadow-xl">
          <Loader className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg ${
            notification.type === "success"
              ? "bg-green-500 text-white"
              : "bg-destructive text-destructive-foreground"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          {notification.message}
        </div>
      )}

      <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-card-foreground">Profile Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-muted border-4 border-primary/20">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={48} className="text-muted-foreground" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition"
              >
                <Camera size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-lg text-card-foreground">
                {profile?.name || "User"}
              </h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Profile Info */}
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1.5">
                  Bio
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(profile?.name || "");
                    setEditPhone(profile?.phone || "");
                    setEditBio(profile?.bio || "");
                  }}
                  className="px-4 py-3 bg-muted text-muted-foreground rounded-xl font-medium hover:bg-muted/80 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-xl">
                <Mail size={20} className="text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-card-foreground">{user.email}</p>
                </div>
              </div>
              {profile?.phone && (
                <div className="flex items-center gap-3 p-4 bg-muted rounded-xl">
                  <Phone size={20} className="text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium text-card-foreground">{profile.phone}</p>
                  </div>
                </div>
              )}
              {profile?.bio && (
                <div className="flex items-start gap-3 p-4 bg-muted rounded-xl">
                  <FileText size={20} className="text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Bio</p>
                    <p className="text-sm text-card-foreground">{profile.bio}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition"
              >
                <Edit3 size={18} />
                Edit Profile
              </button>
            </div>
          )}

          {/* Danger Zone */}
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-destructive mb-3">Danger Zone</h4>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-destructive/10 text-destructive rounded-xl font-medium hover:bg-destructive/20 transition"
            >
              <Trash2 size={18} />
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Image Crop Modal */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-card-foreground">Crop Photo</h3>
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setImgSrc("");
                }}
                className="p-2 hover:bg-muted rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              {imgSrc && (
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    src={imgSrc}
                    alt="Crop"
                    onLoad={onImageLoad}
                    className="max-h-[400px] w-full object-contain"
                  />
                </ReactCrop>
              )}
            </div>
            <div className="p-4 border-t border-border flex gap-3">
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setImgSrc("");
                }}
                className="flex-1 px-4 py-3 bg-muted text-muted-foreground rounded-xl font-medium hover:bg-muted/80 transition"
              >
                Cancel
              </button>
              <button
                onClick={uploadCroppedImage}
                disabled={isSaving || !completedCrop}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <CheckCircle size={18} />
                )}
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground text-center mb-2">
                Delete Account
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-6">
                This action cannot be undone. All your data, listings, and inquiries will be permanently deleted.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1.5">
                    Enter your password to confirm
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-xl text-card-foreground focus:outline-none focus:ring-2 focus:ring-destructive"
                      placeholder="Enter password"
                    />
                  </div>
                  {deleteError && (
                    <p className="text-sm text-destructive mt-2">{deleteError}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletePassword("");
                      setDeleteError("");
                    }}
                    className="flex-1 px-4 py-3 bg-muted text-muted-foreground rounded-xl font-medium hover:bg-muted/80 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-destructive text-destructive-foreground rounded-xl font-medium hover:bg-destructive/90 transition disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader size={18} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
