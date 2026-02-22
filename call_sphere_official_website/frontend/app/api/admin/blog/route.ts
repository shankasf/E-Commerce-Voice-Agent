import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/admin-auth';
import sanitizeHtml from 'sanitize-html';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figure', 'figcaption',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    a: ['href', 'target', 'rel'],
    '*': ['class', 'id'],
  },
  allowedStyles: {
    '*': {
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
  },
};

// GET /api/admin/blog - List all posts
export async function GET(request: NextRequest) {
  const auth = verifyAdminToken(request);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const category = searchParams.get('category');
  const tag = searchParams.get('tag');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const allowedSortFields = ['updatedAt', 'createdAt', 'publishedAt', 'title', 'category'];
  const rawSortBy = searchParams.get('sortBy') || 'updatedAt';
  const sortBy = allowedSortFields.includes(rawSortBy) ? rawSortBy : 'updatedAt';
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  const where: Record<string, unknown> = {};

  if (status === 'draft' || status === 'published') {
    where.status = status;
  }

  if (category) {
    where.category = category;
  }

  if (tag) {
    where.tags = { has: tag };
  }

  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    where.createdAt = dateFilter;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [posts, total, allTags] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { [sortBy]: sortOrder as 'asc' | 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          coverImage: true,
          status: true,
          category: true,
          readTime: true,
          tags: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          author: { select: { name: true } },
        },
      }),
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({ select: { tags: true }, distinct: ['tags'] }),
    ]);

    const uniqueTags = [...new Set(allTags.flatMap((p) => p.tags))].sort();

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      availableTags: uniqueTags,
    });
  } catch (error) {
    console.error('Failed to fetch blog posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST /api/admin/blog - Create new post
export async function POST(request: NextRequest) {
  const auth = verifyAdminToken(request);
  if (!auth.valid || !auth.payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, slug, content, description, category, tags, coverImage, status } = body;

    if (!title || !content || !description || !category) {
      return NextResponse.json(
        { error: 'Title, content, description, and category are required' },
        { status: 400 }
      );
    }

    const finalSlug = slug || slugify(title);

    // Check for duplicate slug
    const existing = await prisma.blogPost.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      return NextResponse.json({ error: 'A post with this slug already exists' }, { status: 409 });
    }

    const sanitizedContent = sanitizeHtml(content, sanitizeOptions);
    const wordCount = sanitizedContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    const readTime = `${Math.max(1, Math.ceil(wordCount / 200))} min read`;

    const post = await prisma.blogPost.create({
      data: {
        slug: finalSlug,
        title,
        description,
        content: sanitizedContent,
        coverImage: coverImage || null,
        status: status === 'published' ? 'published' : 'draft',
        category,
        readTime,
        tags: tags || [],
        authorId: auth.payload.userId,
        publishedAt: status === 'published' ? new Date() : null,
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Failed to create blog post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
