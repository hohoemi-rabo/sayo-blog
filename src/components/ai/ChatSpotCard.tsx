'use client'

import { MapPin, Phone, Clock, ExternalLink } from 'lucide-react'
import type { SpotInfo } from '@/lib/types'

interface ChatSpotCardProps {
  spot: SpotInfo
}

export function ChatSpotCard({ spot }: ChatSpotCardProps) {
  return (
    <div className="p-3 rounded-lg border border-border bg-bg-primary">
      <div className="flex items-center gap-1.5 mb-2">
        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="font-bold text-sm text-text-primary font-noto-sans-jp">
          {spot.name}
        </span>
      </div>

      <div className="space-y-1 text-xs text-text-secondary">
        {spot.address && <p>{spot.address}</p>}
        {spot.phone && (
          <p className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            <a href={`tel:${spot.phone}`} className="hover:text-primary">
              {spot.phone}
            </a>
          </p>
        )}
        {spot.hours && (
          <p className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {spot.hours}
          </p>
        )}
      </div>

      {spot.mapUrl && (
        <a
          href={spot.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          Google マップで見る
        </a>
      )}
    </div>
  )
}
