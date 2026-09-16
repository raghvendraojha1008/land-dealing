import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UploadResult {
  url: string;
  path: string;
}

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadImage = useCallback(async (
    file: File,
    userId: string
  ): Promise<UploadResult | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from("listing-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Upload error:", error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from("listing-images")
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (err) {
      console.error("Upload failed:", err);
      return null;
    }
  }, []);

  const uploadImages = useCallback(async (
    files: File[],
    userId: string
  ): Promise<string[]> => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const result = await uploadImage(files[i], userId);
      if (result) {
        uploadedUrls.push(result.url);
      }
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }
    
    setIsUploading(false);
    setUploadProgress(0);
    
    return uploadedUrls;
  }, [uploadImage]);

  const deleteImage = useCallback(async (path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from("listing-images")
        .remove([path]);

      if (error) {
        console.error("Delete error:", error);
        return false;
      }

      return true;
    } catch (err) {
      console.error("Delete failed:", err);
      return false;
    }
  }, []);

  return {
    uploadImage,
    uploadImages,
    deleteImage,
    isUploading,
    uploadProgress,
  };
}
