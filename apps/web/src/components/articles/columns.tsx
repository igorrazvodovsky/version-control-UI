'use client'

import type { ColumnDef } from '@tanstack/react-table'

import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Article } from '@/lib/articles'

export const columns: ColumnDef<Article>[] = [
  {
    accessorKey: 'title',
    header: 'Article',
    cell: ({ row }) => {
      const article = row.original
      return (
        <div className="min-w-[14rem] max-w-[28rem] whitespace-normal space-y-1">
          <div className="font-medium text-foreground">{article.title}</div>
          <div className="text-sm text-muted-foreground">{article.description}</div>
          <div className="text-xs text-muted-foreground">/{article.slug}</div>
        </div>
      )
    },
  },
  {
    id: 'author',
    header: 'Author',
    accessorFn: (row) => row.author.username,
    cell: ({ row }) => (
      <div className="text-sm font-medium text-foreground">{row.original.author.username}</div>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Published',
    cell: ({ row }) => {
      const createdAt = new Date(row.original.createdAt)
      return (
        <div className="text-sm text-muted-foreground">
          {Number.isNaN(createdAt.getTime()) ? '-' : createdAt.toLocaleDateString()}
        </div>
      )
    },
  },
  {
    id: 'tags',
    header: 'Tags',
    cell: ({ row }) => {
      const tags = row.original.tagList
      if (!tags.length) {
        return <span className="text-sm text-muted-foreground">-</span>
      }

      return (
        <div className="flex flex-wrap gap-1 whitespace-normal">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="px-2 py-0.5">
              {tag}
            </Badge>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: 'favoritesCount',
    header: () => <div className="text-right">Favorites</div>,
    cell: ({ row }) => (
      <div className="text-right text-sm font-medium">{row.original.favoritesCount}</div>
    ),
  },
  {
    id: 'open',
    header: () => <div className="text-right">Open</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <Button asChild size="sm" variant="outline">
          <Link href={`/articles/${row.original.slug}`}>View</Link>
        </Button>
      </div>
    ),
  },
]
