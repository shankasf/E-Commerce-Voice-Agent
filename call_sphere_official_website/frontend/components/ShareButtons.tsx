"use client";

import { useState } from "react";
import {
  Share2,
  Link2,
  Check,
} from "lucide-react";

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const RedditIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-6.627-5.373-12-12-12zm6.066 13.29c.035.246.054.497.054.754 0 3.845-4.479 6.966-10.004 6.966-5.525 0-10.003-3.12-10.003-6.966 0-.264.02-.522.058-.775a1.763 1.763 0 01-.728-1.426c0-.975.79-1.765 1.765-1.765.473 0 .902.186 1.22.49 1.72-1.143 3.994-1.862 6.512-1.938l1.354-4.435a.39.39 0 01.462-.27l3.364.776a1.265 1.265 0 012.294.614 1.263 1.263 0 01-1.263 1.263 1.264 1.264 0 01-1.243-1.062l-2.98-.688-1.177 3.856c2.428.1 4.617.823 6.291 1.943a1.757 1.757 0 011.204-.478c.976 0 1.766.79 1.766 1.765 0 .57-.271 1.077-.694 1.4zM8.154 13.178a1.265 1.265 0 100 2.528 1.265 1.265 0 000-2.528zm7.692 0a1.265 1.265 0 100 2.528 1.265 1.265 0 000-2.528zm-6.905 4.21c-.096-.096-.096-.252 0-.349.096-.096.252-.096.349 0 .86.86 2.315 1.162 3.598.896a4.22 4.22 0 001.91-.896.247.247 0 01.349 0 .247.247 0 010 .349c-.98.98-2.58 1.33-4.02 1.018a4.687 4.687 0 01-2.186-1.018z" />
  </svg>
);

const PinterestIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z" />
  </svg>
);

interface ShareButtonsProps {
  title: string;
  url: string;
  description: string;
  coverImage?: string | null;
}

export function ShareButtons({ title, url, coverImage }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      name: "X",
      href: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: <XIcon />,
      color: "hover:bg-black hover:text-white",
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: <FacebookIcon />,
      color: "hover:bg-[#1877F2] hover:text-white",
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: <LinkedInIcon />,
      color: "hover:bg-[#0A66C2] hover:text-white",
    },
    {
      name: "Reddit",
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      icon: <RedditIcon />,
      color: "hover:bg-[#FF4500] hover:text-white",
    },
    {
      name: "Pinterest",
      href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}${coverImage ? `&media=${encodeURIComponent(coverImage)}` : ""}`,
      icon: <PinterestIcon />,
      color: "hover:bg-[#E60023] hover:text-white",
    },
  ];

  const shareToAll = () => {
    shareLinks.forEach((link) => {
      window.open(link.href, `_blank_${link.name}`, "noopener,noreferrer");
    });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mt-12 max-w-3xl border-t border-slate-200 pt-8">
      <div className="flex items-center gap-3">
        <Share2 className="h-5 w-5 text-slate-500" />
        <span className="text-sm font-semibold text-slate-700">Share this article</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={shareToAll}
          title="Share to all platforms"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-indigo-500 hover:to-purple-500"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share to All</span>
        </button>
        {shareLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            title={`Share on ${link.name}`}
            className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition-all ${link.color}`}
          >
            {link.icon}
            <span className="hidden sm:inline">{link.name}</span>
          </a>
        ))}
        <button
          onClick={copyLink}
          title="Copy link"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition-all hover:bg-indigo-600 hover:text-white"
        >
          {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          <span className="hidden sm:inline">{copied ? "Copied!" : "Copy link"}</span>
        </button>
      </div>
    </div>
  );
}
