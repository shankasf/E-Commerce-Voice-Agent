"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExtension from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  Save,
  Send,
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Share2,
  ExternalLink,
  Check,
} from "lucide-react";
import { EditorToolbar } from "./EditorToolbar";

interface BlogPostData {
  id?: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  coverImage: string | null;
  category: string;
  tags: string[];
  status: string;
}

const CATEGORIES = [
  "Guides",
  "Comparisons",
  "Healthcare",
  "Business",
  "Technology",
  "Case Studies",
  "News",
  "Agentic AI",
  "Large Language Models",
  "Voice AI Agents",
  "Chat Agents",
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function BlogPostEditor({
  initialData,
  mode,
}: {
  initialData?: BlogPostData;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [category, setCategory] = useState(initialData?.category || CATEGORIES[0]);
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(
    initialData?.coverImage || null
  );
  const [coverAlt, setCoverAlt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension.configure({ inline: false, allowBase64: false }),
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write your blog post content..." }),
      UnderlineExtension,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: initialData?.content || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-slate max-w-none min-h-[400px] p-6 focus:outline-none",
      },
    },
  });

  // Auto-generate slug from title (both create and edit modes)
  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(title));
    }
  }, [title, slugManuallyEdited]);

  const handleCoverUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/blog/upload?type=cover", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setCoverImage(data.url);
        if (data.altText) setCoverAlt(data.altText);
      } else {
        setError(data.error || "Upload failed");
      }
    } catch {
      setError("Failed to upload cover image");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSave = async (status: "draft" | "published") => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (!editor?.getHTML() || editor.isEmpty) {
      setError("Content is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      title,
      slug,
      description,
      content: editor.getHTML(),
      category,
      tags,
      coverImage,
      status,
    };

    try {
      const url =
        mode === "edit" && initialData?.id
          ? `/api/admin/blog/${initialData.id}`
          : "/api/admin/blog";

      const res = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save post");
        return;
      }

      if (status === "published") {
        setPublishedSlug(slug);
        setPublishedPostId(data.post?.id || data.id || initialData?.id || null);
        return;
      }

      router.push("/admin/blog");
    } catch {
      setError("Failed to save post");
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/blog")}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">
            {mode === "create" ? "New Blog Post" : "Edit Blog Post"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave("draft")}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Draft
          </button>
          <button
            onClick={() => handleSave("published")}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Publish
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Title */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title..."
            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white text-xl font-semibold placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Slug
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManuallyEdited(true);
              }}
              placeholder="post-slug"
              className="flex-1 px-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-slate-300 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {slugManuallyEdited && (
              <button
                type="button"
                onClick={() => {
                  setSlugManuallyEdited(false);
                  setSlug(slugify(title));
                }}
                className="px-3 py-2 text-xs text-slate-400 hover:text-white bg-slate-800/50 border border-white/10 rounded-xl hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                Auto from title
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description for SEO and card previews..."
            rows={3}
            className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-slate-300 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Category and Tags row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Tags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag..."
                className="flex-1 px-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm transition-colors"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-500/20 text-indigo-300 text-sm rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Cover Image
          </label>
          {coverImage ? (
            <div className="space-y-2">
              <div className="relative rounded-xl overflow-hidden border border-white/10">
                <img
                  src={coverImage}
                  alt={coverAlt || "Cover"}
                  className="w-full h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCoverImage(null);
                    setCoverAlt("");
                  }}
                  className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={coverAlt}
                onChange={(e) => setCoverAlt(e.target.value)}
                placeholder="Alt text for cover image..."
                className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-slate-300 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-indigo-500/50 transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCoverUpload(file);
                }}
              />
              {isUploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-500 mb-2" />
                  <span className="text-sm text-slate-500">
                    Click to upload cover image
                  </span>
                  <span className="text-xs text-slate-600 mt-1">
                    JPEG, PNG, WebP, GIF (max 5MB)
                  </span>
                </>
              )}
            </label>
          )}
        </div>

        {/* WYSIWYG Editor */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Content
          </label>
          <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-800/30">
            <EditorToolbar editor={editor} />
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* Share After Publish Modal */}
      {publishedSlug && (
        <PublishShareModal
          slug={publishedSlug}
          postId={publishedPostId}
          title={title}
          description={description}
          coverImage={coverImage}
          onClose={() => router.push("/admin/blog")}
        />
      )}
    </div>
  );
}

function PublishShareModal({
  slug,
  postId,
  title,
  description,
  coverImage,
  onClose,
}: {
  slug: string;
  postId: string | null;
  title: string;
  description: string;
  coverImage: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [notifyMessage, setNotifyMessage] = useState("");

  const notifySubscribers = async () => {
    if (!postId) return;
    setNotifyStatus("sending");
    try {
      const token = document.cookie
        .split("; ")
        .find((c) => c.startsWith("admin_token="))
        ?.split("=")[1];
      const res = await fetch("/api/newsletter/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotifyStatus("sent");
        setNotifyMessage(`Sent to ${data.sent} subscriber${data.sent !== 1 ? "s" : ""}`);
      } else {
        setNotifyStatus("error");
        setNotifyMessage(data.error || "Failed to notify");
      }
    } catch {
      setNotifyStatus("error");
      setNotifyMessage("Failed to send notifications");
    }
  };
  const baseUrl = "https://callsphere.tech";
  const postUrl = `${baseUrl}/blog/${slug}`;
  const encodedUrl = encodeURIComponent(postUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDesc = encodeURIComponent(description);

  const platforms = [
    {
      name: "X (Twitter)",
      url: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: "bg-black hover:bg-gray-800",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "Facebook",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "bg-[#1877F2] hover:bg-[#1565c0]",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: "bg-[#0A66C2] hover:bg-[#094d92]",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      name: "Reddit",
      url: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      color: "bg-[#FF4500] hover:bg-[#e03d00]",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-6.627-5.373-12-12-12zm6.066 13.29c.035.246.054.497.054.754 0 3.845-4.479 6.966-10.004 6.966-5.525 0-10.003-3.12-10.003-6.966 0-.264.02-.522.058-.775a1.763 1.763 0 01-.728-1.426c0-.975.79-1.765 1.765-1.765.473 0 .902.186 1.22.49 1.72-1.143 3.994-1.862 6.512-1.938l1.354-4.435a.39.39 0 01.462-.27l3.364.776a1.265 1.265 0 012.294.614 1.263 1.263 0 01-1.263 1.263 1.264 1.264 0 01-1.243-1.062l-2.98-.688-1.177 3.856c2.428.1 4.617.823 6.291 1.943a1.757 1.757 0 011.204-.478c.976 0 1.766.79 1.766 1.765 0 .57-.271 1.077-.694 1.4zM8.154 13.178a1.265 1.265 0 100 2.528 1.265 1.265 0 000-2.528zm7.692 0a1.265 1.265 0 100 2.528 1.265 1.265 0 000-2.528zm-6.905 4.21c-.096-.096-.096-.252 0-.349.096-.096.252-.096.349 0 .86.86 2.315 1.162 3.598.896a4.22 4.22 0 001.91-.896.247.247 0 01.349 0 .247.247 0 010 .349c-.98.98-2.58 1.33-4.02 1.018a4.687 4.687 0 01-2.186-1.018z" />
        </svg>
      ),
    },
    {
      name: "Pinterest",
      url: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}${coverImage ? `&media=${encodeURIComponent(baseUrl + coverImage)}` : ""}`,
      color: "bg-[#E60023] hover:bg-[#c9001f]",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z" />
        </svg>
      ),
    },
  ];

  const shareToAll = () => {
    platforms.forEach((platform) => {
      window.open(platform.url, `_blank_${platform.name}`, "noopener,noreferrer");
    });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = postUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
        {/* Success Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-4">
            <Check className="w-6 h-6 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Post Published!</h2>
          <p className="text-slate-400 text-sm mt-1">
            Share it on social media to reach more people
          </p>
        </div>

        {/* Copy Link */}
        <div className="flex items-center gap-2 mb-6 p-3 bg-slate-800/50 border border-white/10 rounded-xl">
          <input
            type="text"
            readOnly
            value={postUrl}
            className="flex-1 bg-transparent text-slate-300 text-sm focus:outline-none truncate"
          />
          <button
            onClick={copyLink}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              copied
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Notify Subscribers */}
        {postId && (
          <button
            onClick={notifySubscribers}
            disabled={notifyStatus === "sending" || notifyStatus === "sent"}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 mb-3 text-sm font-semibold rounded-xl transition-all ${
              notifyStatus === "sent"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : notifyStatus === "error"
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white"
            } disabled:opacity-60`}
          >
            {notifyStatus === "sending" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : notifyStatus === "sent" ? (
              <Check className="w-5 h-5" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            {notifyStatus === "sent"
              ? notifyMessage
              : notifyStatus === "sending"
              ? "Sending to subscribers..."
              : notifyStatus === "error"
              ? notifyMessage
              : "Notify Email Subscribers"}
          </button>
        )}

        {/* Share to All */}
        <button
          onClick={shareToAll}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Share2 className="w-5 h-5" />
          Share to All Platforms
        </button>

        {/* Social Platforms */}
        <div className="grid grid-cols-2 gap-3">
          {platforms.map((platform) => (
            <a
              key={platform.name}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium transition-colors ${platform.color}`}
            >
              {platform.icon}
              {platform.name}
              <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-50" />
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
          <a
            href={postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View post
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            Go to Blog List
          </button>
        </div>
      </div>
    </div>
  );
}
