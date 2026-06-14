'use client'

import React from 'react'

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

function SkeletonBlock({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200/80 ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/80">
      {/* Header */}
      <div className="flex gap-4 border-b border-gray-100 bg-gray-50/80 px-4 py-3">
        {[40, 100, 80, 70, 60].map((w, i) => (
          <SkeletonBlock key={i} className="h-3" style={{ width: w }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-gray-50 px-4 py-3.5"
          style={{ opacity: 1 - i * 0.12 }}
        >
          <SkeletonBlock className="h-8 w-8 flex-shrink-0 rounded-full" />
          <SkeletonBlock className="h-3.5 flex-1" />
          <SkeletonBlock className="h-3.5 w-20" />
          <SkeletonBlock className="h-6 w-16 rounded-full" />
          <SkeletonBlock className="h-3.5 w-14" />
        </div>
      ))}
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/80 p-5">
      <SkeletonBlock className="h-3 w-24" />
      <SkeletonBlock className="h-8 w-16" />
      <SkeletonBlock className="h-3 w-32" />
    </div>
  )
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-4 grid-cols-2 lg:grid-cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-5 space-y-3">
      <SkeletonBlock className="h-4 w-36" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} className="h-3" style={{ width: `${85 - i * 15}%` }} />
      ))}
    </div>
  )
}
