import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle, Upload, X, FileImage, Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { publicSubmitRepair } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

const PHONE_BRANDS = ["Samsung", "Apple", "Vivo", "Oppo", "Realme", "OnePlus", "Xiaomi", "Nokia", "Motorola", "Other"];
const PROBLEM_TYPES = [
  { value: "screen", label: "Screen / Display Damage" },
  { value: "battery", label: "Battery / Short Battery Life" },
  { value: "charging", label: "Charging / Port Issue" },
  { value: "software", label: "Software / Hanging / Slow" },
  { value: "camera", label: "Camera Issue" },
  { value: "speaker", label: "Speaker / Microphone Issue" },
  { value: "water", label: "Water Damage" },
  { value: "other", label: "Other" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 3;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
];

const EMPTY = {
  customer_name: "",
  phone: "",
  email: "",
  phone_brand: "",
  phone_model: "",
  problem_type: "" as string,
  description: "",
  preferred_contact: "phone" as "phone" | "whatsapp" | "email",
};

interface LocalFile {
  file: File;
  previewUrl: string;
  type: "image" | "video";
}

export function RepairEnquiryForm() {
  const [form, setForm] = useState(EMPTY);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageInput, setImageInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<LocalFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const submitRepair = useServerFn(publicSubmitRepair);

  function set(k: keyof typeof EMPTY, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function addImageUrl() {
    const url = imageInput.trim();
    if (url && !imageUrls.includes(url)) {
      if (imageUrls.length + selectedFiles.length >= MAX_FILES) {
        toast.error(`You can attach a maximum of ${MAX_FILES} images/videos.`);
        return;
      }
      setImageUrls((prev) => [...prev, url]);
      setImageInput("");
    }
  }

  function removeImageUrl(url: string) {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (selectedFiles.length + files.length + imageUrls.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} attachments allowed in total.`);
      return;
    }

    const validNewFiles: LocalFile[] = [];
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`"${f.name}" exceeds the 10MB limit.`);
        continue;
      }
      if (!ALLOWED_TYPES.includes(f.type) && !f.name.match(/\.(jpg|jpeg|png|webp|mp4|mov)$/i)) {
        toast.error(`"${f.name}" is not a supported image (JPG, PNG, WebP) or video (MP4, MOV).`);
        continue;
      }

      const isVideo = f.type.startsWith("video/") || f.name.match(/\.(mp4|mov)$/i);
      validNewFiles.push({
        file: f,
        previewUrl: URL.createObjectURL(f),
        type: isVideo ? "video" : "image",
      });
    }

    setSelectedFiles((prev) => [...prev, ...validNewFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function uploadFilesToSupabase(files: LocalFile[]): Promise<{ uploadedImages: string[]; uploadedVideos: string[] }> {
    const uploadedImages: string[] = [];
    const uploadedVideos: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      setUploadProgress(`Uploading attachment ${i + 1} of ${files.length}...`);

      const ext = item.file.name.split(".").pop() || (item.type === "video" ? "mp4" : "jpg");
      const fileName = `enquiry_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

      try {
        const { data, error } = await supabase.storage
          .from("repair-media")
          .upload(fileName, item.file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) {
          console.warn("Supabase storage upload fallback:", error.message);
          // Graceful fallback: continue without blocking enquiry submission
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from("repair-media")
          .getPublicUrl(data.path);

        if (publicUrlData?.publicUrl) {
          if (item.type === "video") {
            uploadedVideos.push(publicUrlData.publicUrl);
          } else {
            uploadedImages.push(publicUrlData.publicUrl);
          }
        }
      } catch (err) {
        console.warn("Storage upload error:", err);
      }
    }

    return { uploadedImages, uploadedVideos };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name || !form.phone || !form.phone_brand || !form.phone_model || !form.problem_type) {
      toast.error("Please fill all required fields.");
      return;
    }

    setLoading(true);
    try {
      let finalImages = [...imageUrls];
      let finalVideos: string[] = [];

      if (selectedFiles.length > 0) {
        const { uploadedImages, uploadedVideos } = await uploadFilesToSupabase(selectedFiles);
        finalImages = [...finalImages, ...uploadedImages];
        finalVideos = [...uploadedVideos];
      }

      setUploadProgress("Submitting enquiry...");
      const result = await submitRepair({
        data: {
          customer_name: form.customer_name,
          phone: form.phone,
          email: form.email || null,
          phone_brand: form.phone_brand,
          phone_model: form.phone_model,
          problem_type: form.problem_type,
          description: form.description || null,
          image_urls: finalImages,
          video_urls: finalVideos,
          preferred_contact: form.preferred_contact,
        },
      });

      setSubmitted((result as { enquiry_number: string }).enquiry_number);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit enquiry.");
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="size-16 text-primary" />
        </div>
        <h3 className="text-xl font-bold">Enquiry Submitted!</h3>
        <p className="text-muted-foreground text-sm">
          Your repair enquiry number is:
        </p>
        <p className="font-serif text-2xl font-bold text-primary">{submitted}</p>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          We will contact you within 2 business hours. Please keep this enquiry number handy.
        </p>
        <Button onClick={() => { setSubmitted(null); setForm(EMPTY); setImageUrls([]); setSelectedFiles([]); }}>
          Submit Another Enquiry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="repair-name">Full Name <span className="text-destructive-foreground">*</span></Label>
          <Input id="repair-name" value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder="Your name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="repair-phone">Mobile Number <span className="text-destructive-foreground">*</span></Label>
          <Input id="repair-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="10-digit number" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="repair-email">Email (optional)</Label>
          <Input id="repair-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="your@email.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="repair-contact">Preferred Contact</Label>
          <Select value={form.preferred_contact} onValueChange={(v) => set("preferred_contact", v as "phone" | "whatsapp" | "email")}>
            <SelectTrigger id="repair-contact"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="phone">Phone Call</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="repair-brand">Phone Brand <span className="text-destructive-foreground">*</span></Label>
          <Select value={form.phone_brand} onValueChange={(v) => set("phone_brand", v)}>
            <SelectTrigger id="repair-brand"><SelectValue placeholder="Select brand" /></SelectTrigger>
            <SelectContent>
              {PHONE_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="repair-model">Phone Model <span className="text-destructive-foreground">*</span></Label>
          <Input id="repair-model" value={form.phone_model} onChange={(e) => set("phone_model", e.target.value)} placeholder="e.g. Galaxy S23, iPhone 14" required />
        </div>
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="repair-problem">Problem Type <span className="text-destructive-foreground">*</span></Label>
          <Select value={form.problem_type} onValueChange={(v) => set("problem_type", v)}>
            <SelectTrigger id="repair-problem"><SelectValue placeholder="Select problem type" /></SelectTrigger>
            <SelectContent>
              {PROBLEM_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="repair-desc">Describe the Issue (optional)</Label>
          <Textarea id="repair-desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe what is happening with your phone..." />
        </div>

        {/* File Upload Section */}
        <div className="sm:col-span-2 space-y-3">
          <Label>Photos / Videos of Device Damage (optional)</Label>
          <p className="text-xs text-muted-foreground">
            Attach up to 3 files (JPG, PNG, WebP, MP4, MOV · Max 10MB each).
          </p>

          <div className="flex flex-wrap gap-2 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={selectedFiles.length + imageUrls.length >= MAX_FILES || loading}
            >
              <Upload className="size-4 mr-2" /> Upload From Device
            </Button>
            <span className="text-xs text-muted-foreground">
              {selectedFiles.length + imageUrls.length}/{MAX_FILES} attached
            </span>
          </div>

          {/* Staged local previews */}
          {selectedFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-2">
              {selectedFiles.map((item, idx) => (
                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-card">
                  {item.type === "video" ? (
                    <div className="size-full flex flex-col items-center justify-center bg-secondary/50 p-2 text-center">
                      <Video className="size-6 text-primary mb-1" />
                      <span className="text-[10px] truncate max-w-full text-muted-foreground">{item.file.name}</span>
                    </div>
                  ) : (
                    <img src={item.previewUrl} alt="Preview" className="size-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute top-1 right-1 rounded-full bg-destructive text-destructive-foreground p-1 opacity-80 hover:opacity-100 transition-opacity"
                    aria-label="Remove file"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Fallback URL Input */}
          <div className="pt-2 border-t border-border/40">
            <p className="text-xs text-muted-foreground mb-1">Or paste a public image URL:</p>
            <div className="flex gap-2">
              <Input
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
                placeholder="https://..."
                disabled={selectedFiles.length + imageUrls.length >= MAX_FILES || loading}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addImageUrl}
                disabled={selectedFiles.length + imageUrls.length >= MAX_FILES || loading}
              >
                Add Link
              </Button>
            </div>
            {imageUrls.length > 0 && (
              <div className="mt-2 space-y-1">
                {imageUrls.map((url) => (
                  <div key={url} className="flex items-center justify-between gap-2 text-xs text-muted-foreground bg-secondary/30 rounded-md px-2 py-1">
                    <span className="truncate">{url}</span>
                    <button type="button" onClick={() => removeImageUrl(url)}>
                      <X className="size-3 text-destructive-foreground hover:opacity-80" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {uploadProgress && (
        <div className="flex items-center gap-2 text-xs text-primary font-medium">
          <Loader2 className="size-3.5 animate-spin" />
          <span>{uploadProgress}</span>
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            {uploadProgress || "Submitting..."}
          </>
        ) : (
          "Send Repair Enquiry"
        )}
      </Button>
    </form>
  );
}
