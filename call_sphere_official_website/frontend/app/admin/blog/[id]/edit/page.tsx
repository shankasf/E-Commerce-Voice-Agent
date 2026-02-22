"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BlogPostEditor } from "@/components/admin/BlogPostEditor";

export default function EditBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<{
    id: string;
    title: string;
    slug: string;
    description: string;
    content: string;
    coverImage: string | null;
    category: string;
    tags: string[];
    status: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`/api/admin/blog/${params.id}`);
        if (!res.ok) {
          router.push("/admin/blog");
          return;
        }
        const data = await res.json();
        setPost(data.post);
      } catch {
        router.push("/admin/blog");
      } finally {
        setIsLoading(false);
      }
    }
    fetchPost();
  }, [params.id, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!post) return null;

  return (
    <BlogPostEditor
      mode="edit"
      initialData={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        description: post.description,
        content: post.content,
        coverImage: post.coverImage,
        category: post.category,
        tags: post.tags,
        status: post.status,
      }}
    />
  );
}
